import { School, Subscription, Plan, Student } from '../models/index.js';
import ApiError from './ApiError.js';

/**
 * School ke plan me active students ki limit bachi hai ya nahi.
 * Transaction ke andar chalaiye - school row lock hota hai taaki limit ke
 * paas do admissions ek saath na nikal jayein. maxStudents 0 = unlimited.
 */
export async function assertStudentSeat(req, t) {
    await School.findByPk(req.schoolId, { lock: t.LOCK.UPDATE, transaction: t });

    const sub = await Subscription.findOne({
        where: { schoolId: req.schoolId, status: 'active' },
        include: [{ model: Plan, as: 'plan', attributes: ['name', 'maxStudents'] }],
        order: [['endsOn', 'DESC']],
        transaction: t,
    });
    const max = Number(sub?.plan?.maxStudents || 0);
    if (!max) return;

    const active = await Student.count({ where: { schoolId: req.schoolId, status: 'active' }, transaction: t });
    if (active >= max) {
        throw ApiError.forbidden(
            sub.plan.name + ' plan me ' + max + ' active students tak ki limit hai - plan upgrade kijiye'
        );
    }
}
