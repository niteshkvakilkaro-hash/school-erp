import { FeeHead, StudentFee, FeePayment, Student } from '../models/index.js';

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

// [name, code, amount, frequency, isOptional]
const HEADS = [
    ['Tuition Fee', 'TUITION', 25000, 'annual', false],
    ['Activity Fee', 'ACTIVITY', 5000, 'annual', false],
    ['Library Fee', 'LIBRARY', 2500, 'annual', false],
    ['Examination Fee', 'EXAM', 10000, 'annual', false],
    ['Transport Fee', 'TRANSPORT', 7500, 'annual', true],
];

/**
 * Har school me 5 fee heads, sabhi students par lagayi hui, aur alag-alag
 * payment states - taaki UI me paid / partial / pending teeno dikhein.
 */
export async function seedFees(school, users) {
    const heads = [];
    for (const [name, code, amount, frequency, isOptional] of HEADS) {
        heads.push(
            await FeeHead.create({
                schoolId: school.id,
                name,
                code,
                amount,
                frequency,
                isOptional,
                description: name + ' - ' + frequency,
            })
        );
    }

    const students = await Student.findAll({
        where: { schoolId: school.id, status: 'active' },
        attributes: ['id', 'rollNo'],
    });
    if (students.length === 0) return { heads: heads.length, fees: 0, payments: 0 };

    const dueDate = iso(addDays(new Date(), 20));

    const rows = [];
    for (const s of students) {
        for (const head of heads) {
            // Transport optional hai - har teesre student par hi lagta hai
            if (head.isOptional && s.id % 3 !== 0) continue;
            rows.push({
                schoolId: school.id,
                studentId: s.id,
                feeHeadId: head.id,
                amount: head.amount,
                dueDate,
            });
        }
    }
    for (let i = 0; i < rows.length; i += 500) {
        await StudentFee.bulkCreate(rows.slice(i, i + 500), { ignoreDuplicates: true });
    }

    // ---- Payments ----
    const fees = await StudentFee.findAll({ where: { schoolId: school.id } });
    let receipt = 0;
    let paymentCount = 0;
    const year = new Date().getFullYear();

    for (const fee of fees) {
        // Deterministic pattern: ~60% poora paid, ~20% partial, ~20% pending
        const seed = (fee.studentId * 7 + fee.feeHeadId * 13) % 10;
        if (seed >= 8) continue; // pending - koi payment nahi

        const payable = Number(fee.amount) - Number(fee.discount);
        const amount = seed >= 6 ? Math.round(payable * 0.4) : payable;

        receipt++;
        await FeePayment.create({
            schoolId: school.id,
            studentId: fee.studentId,
            studentFeeId: fee.id,
            receiptNo: 'RCPT' + year + '-' + String(receipt).padStart(4, '0'),
            amount,
            mode: ['cash', 'upi', 'card', 'netbanking'][seed % 4],
            paidOn: iso(addDays(new Date(), -(seed * 9 + 3))),
            collectedById: users.admin.id,
        });
        paymentCount++;

        await fee.update({
            paidAmount: amount,
            status: amount >= payable ? 'paid' : 'partial',
        });
    }

    return { heads: heads.length, fees: rows.length, payments: paymentCount };
}
