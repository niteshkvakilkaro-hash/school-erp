import { Vehicle, TransportRoute, RouteStop, StudentTransport, Student } from '../models/index.js';

// [regNo suffix, type, capacity, driver, helper, status, insurance months from now]
const VEHICLES = [
    ['1234', 'bus', 40, 'Ramesh Yadav', 'Suresh', 'active', 8],
    ['5678', 'bus', 35, 'Mahesh Singh', 'Rakesh', 'active', 3],
    ['2468', 'van', 12, 'Imran Khan', null, 'active', -1],
    ['9090', 'mini-bus', 20, 'Pappu Verma', 'Golu', 'active', 11],
    ['4321', 'bus', 40, 'Harish Pal', 'Dinesh', 'maintenance', 5],
];

// [code, name, vehicle index, fare, stops[name, pickup, drop]]
const ROUTES = [
    ['R1', 'Civil Lines - Station Road', 0, 1200, [
        ['Civil Lines Chauraha', '07:05', '14:20'],
        ['Collectorate', '07:15', '14:10'],
        ['Railway Station', '07:25', '14:00'],
        ['Gandhi Park', '07:35', '13:50'],
    ]],
    ['R2', 'Shastri Nagar - Bypass', 1, 1400, [
        ['Shastri Nagar', '06:55', '14:35'],
        ['Transport Nagar', '07:10', '14:20'],
        ['Bypass Tiraha', '07:20', '14:10'],
        ['Mandi Gate', '07:30', '14:00'],
    ]],
    ['R3', 'Old City Van', 2, 1600, [
        ['Ghanta Ghar', '07:15', '14:15'],
        ['Sadar Bazaar', '07:25', '14:05'],
    ]],
    ['R4', 'Cantt - Airport Road', 3, 1500, [
        ['Cantt Gate', '07:00', '14:30'],
        ['Airport Road', '07:15', '14:15'],
        ['Sainik Colony', '07:25', '14:05'],
    ]],
];

const monthsFromNow = (n) => {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
};

/**
 * Vehicles, routes, stops aur students ke assignments. Capacity ka dhyan
 * rakha gaya hai - koi route overfill nahi hota. Ek vehicle maintenance me
 * hai aur ek ka insurance expire hai taaki alerts dikhein.
 */
export async function seedTransport(school) {
    const prefix = 'MP-' + String(8 + school.id).padStart(2, '0') + '-P-';
    const vehicles = [];
    for (const [suffix, type, capacity, driver, helper, status, ins] of VEHICLES) {
        vehicles.push(
            await Vehicle.create({
                schoolId: school.id,
                regNo: prefix + suffix,
                type,
                capacity,
                driverName: driver,
                driverPhone: '97' + String(10000000 + capacity * 1111 + Number(suffix)).slice(0, 8),
                helperName: helper,
                helperPhone: helper ? '96' + String(20000000 + Number(suffix) * 7).slice(0, 8) : null,
                insuranceExpiry: monthsFromNow(ins),
                status,
            })
        );
    }

    const routes = [];
    let stopCount = 0;
    for (const [code, name, vIdx, fare, stops] of ROUTES) {
        const route = await TransportRoute.create({
            schoolId: school.id,
            code,
            name,
            vehicleId: vehicles[vIdx].id,
            monthlyFare: fare,
        });
        route.stopRows = [];
        for (const [i, [stopName, pickupTime, dropTime]] of stops.entries()) {
            route.stopRows.push(
                await RouteStop.create({
                    schoolId: school.id,
                    routeId: route.id,
                    name: stopName,
                    pickupTime,
                    dropTime,
                    sortOrder: i + 1,
                })
            );
            stopCount++;
        }
        route.capacity = vehicles[vIdx].capacity;
        routes.push(route);
    }

    const students = await Student.findAll({
        where: { schoolId: school.id, status: 'active' },
        attributes: ['id'],
        order: [['id', 'ASC']],
    });

    // Lagbhag 60% students bus se aate hain; demo student (pehla) hamesha
    const filled = {};
    let riders = 0;
    for (const [i, s] of students.entries()) {
        if (i > 0 && i % 5 >= 3) continue;
        const route = routes[i % routes.length];
        if ((filled[route.id] || 0) >= route.capacity) continue;
        const stop = route.stopRows[Math.floor(i / routes.length) % route.stopRows.length];
        await StudentTransport.create({
            schoolId: school.id,
            studentId: s.id,
            routeId: route.id,
            stopId: stop.id,
            startDate: '2026-04-01',
        });
        filled[route.id] = (filled[route.id] || 0) + 1;
        riders++;
    }

    return { vehicles: vehicles.length, routes: routes.length, stops: stopCount, riders };
}
