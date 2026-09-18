import { Book, BookIssue, Student } from '../models/index.js';
import { RULES } from '../controllers/library.controller.js';

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

// [title, author, publisher, category, copies, price]
const BOOKS = [
    ['Mathematics - Class 8', 'R.D. Sharma', 'Dhanpat Rai', 'Textbook', 6, 450],
    ['Science - Class 9', 'NCERT', 'NCERT', 'Textbook', 5, 220],
    ['English Grammar', 'Wren & Martin', 'S. Chand', 'Reference', 4, 380],
    ['History of India', 'Bipan Chandra', 'Orient Blackswan', 'Reference', 2, 520],
    ['Godan', 'Munshi Premchand', 'Rajkamal', 'Hindi Literature', 3, 260],
    ['Wings of Fire', 'A.P.J. Abdul Kalam', 'Universities Press', 'Biography', 3, 299],
    ['Harry Potter and the Philosopher\'s Stone', 'J.K. Rowling', 'Bloomsbury', 'Fiction', 2, 399],
    ['The Jungle Book', 'Rudyard Kipling', 'Penguin', 'Fiction', 3, 199],
    ['Oxford Student Atlas', 'Oxford', 'Oxford University Press', 'Reference', 4, 450],
    ['Computer Fundamentals', 'P.K. Sinha', 'BPB', 'Textbook', 3, 340],
    ['Malgudi Days', 'R.K. Narayan', 'Penguin', 'Fiction', 2, 250],
    ['Physics Olympiad Guide', 'MTG', 'MTG Learning', 'Competitive', 1, 560],
];

/**
 * Books + teen tarah ke issues: time par wapas, abhi bahar (kuch overdue),
 * aur late return jinka fine baaki hai - taaki library ke saare cases dikhein.
 */
export async function seedLibrary(school, users) {
    const books = [];
    for (const [i, [title, author, publisher, category, copies, price]] of BOOKS.entries()) {
        books.push(
            await Book.create({
                schoolId: school.id,
                title,
                author,
                publisher,
                category,
                code: 'LIB-' + String(i + 1).padStart(4, '0'),
                totalCopies: copies,
                shelf: 'S-' + ((i % 4) + 1),
                price,
            })
        );
    }

    const students = await Student.findAll({
        where: { schoolId: school.id, status: 'active' },
        attributes: ['id'],
        limit: 20,
        order: [['id', 'ASC']],
    });

    // Copies ka hisaab rakhte hain taaki seed data khud niyam na tode
    const out = {};
    const holding = {};
    let issued = 0;

    const tryIssue = async (book, studentId, issuedOffset, returnOffset, finePaid) => {
        if ((out[book.id] || 0) >= book.totalCopies) return;
        if (returnOffset === null && (holding[studentId] || 0) >= RULES.maxBooksPerStudent) return;

        const issuedOn = addDays(new Date(), issuedOffset);
        const dueOn = addDays(issuedOn, RULES.loanDays);
        const returnedOn = returnOffset === null ? null : addDays(new Date(), returnOffset);

        let fine = 0;
        if (returnedOn) {
            const late = Math.round((returnedOn - dueOn) / 86400000);
            fine = late > 0 ? late * RULES.finePerDay : 0;
        }

        await BookIssue.create({
            schoolId: school.id,
            bookId: book.id,
            studentId,
            issuedOn: iso(issuedOn),
            dueOn: iso(dueOn),
            returnedOn: returnedOn ? iso(returnedOn) : null,
            fine,
            finePaid: fine > 0 ? finePaid : true,
            issuedById: users.admin.id,
        });
        issued++;

        if (!returnedOn) {
            out[book.id] = (out[book.id] || 0) + 1;
            holding[studentId] = (holding[studentId] || 0) + 1;
        }
    };

    for (const [i, s] of students.entries()) {
        const b = books[i % books.length];
        // Purani, time par wapas
        await tryIssue(b, s.id, -40, -30, true);

        if (i % 3 === 0) {
            // Abhi bahar, overdue (20 din pehle issue, 14 din ka loan)
            await tryIssue(books[(i + 3) % books.length], s.id, -20, null, false);
        } else if (i % 3 === 1) {
            // Abhi bahar, due date aage
            await tryIssue(books[(i + 5) % books.length], s.id, -4, null, false);
        } else {
            // Late wapas aayi, fine baaki
            await tryIssue(books[(i + 7) % books.length], s.id, -30, -8, false);
        }
    }

    return { books: books.length, issues: issued };
}
