import { upsertSchoolAttendance, upsertBusAttendance, listSchoolAttendance, listBusAttendance, getAdminSchoolId, getDriverScope, getTeacherScope, filterStudentsBySchool, filterStudentsByClass, filterStudentsByBus, type AttendanceEntry } from './repo.js';
import { findRunningTripForDriverUser, getTripByIdSimple, listTripTargetsSummary } from '../tracking/repo.js';

export async function recordSchoolAttendance(params: { role: string; user_id: string; entries: AttendanceEntry[]; school_id?: string | null }) {
  let schoolId: string | null = null;
  let filteredEntries: AttendanceEntry[] = params.entries;
  if (params.role === 'superadmin') {
    schoolId = params.school_id ?? null;
  } else if (params.role === 'admin') {
    schoolId = await getAdminSchoolId(params.user_id);
  } else if (params.role === 'teacher') {
    const scope = await getTeacherScope(params.user_id);
    schoolId = scope.school_id;
    if (schoolId && scope.class_id) {
      const ids = filteredEntries.map(e => e.student_id);
      const allowed = await filterStudentsByClass(schoolId, scope.class_id, ids);
      filteredEntries = filteredEntries.filter(e => allowed.has(e.student_id));
    } else {
      filteredEntries = [];
    }
  }
  if (!schoolId) throw new Error('scope_not_found');
  if (params.role === 'admin') {
    const ids = filteredEntries.map(e => e.student_id);
    const allowed = await filterStudentsBySchool(schoolId, ids);
    filteredEntries = filteredEntries.filter(e => allowed.has(e.student_id));
  }
  const count = await upsertSchoolAttendance(schoolId, params.user_id, params.role, filteredEntries);
  return { upserted: count };
}

export async function recordBusAttendance(params: { role: string; user_id: string; entries: AttendanceEntry[]; school_id?: string | null; bus_id?: string | null; trip_id?: string | null }) {
  let schoolId: string | null = null;
  let driverBusId: string | null = null;
  let tripId: string | null = params.trip_id ?? null;
  let filteredEntries: AttendanceEntry[] = params.entries;
  if (params.role === 'superadmin') {
    schoolId = params.school_id ?? null;
    driverBusId = params.bus_id ?? null;
  } else if (params.role === 'admin') {
    schoolId = await getAdminSchoolId(params.user_id);
    driverBusId = params.bus_id ?? null;
  } else if (params.role === 'driver') {
    const scope = await getDriverScope(params.user_id);
    schoolId = scope.school_id;
    driverBusId = scope.bus_id;
    // Determine or validate running trip for driver
    if (!tripId) {
      const running = await findRunningTripForDriverUser(params.user_id);
      tripId = running?.id ?? null;
    }
  } else if (params.role === 'teacher') {
    const scope = await getTeacherScope(params.user_id);
    schoolId = scope.school_id;
  }
  if (!schoolId) throw new Error('scope_not_found');
  // If driver is recording bus attendance, require a valid pickup trip and restrict marking rules
  if (params.role === 'driver') {
    if (!tripId) throw new Error('no_running_trip');
    const trip = await getTripByIdSimple(tripId);
    if (!trip || trip.status !== 'running' || trip.direction !== 'pickup') {
      throw new Error('bus_attendance_only_on_pickup_running_trip');
    }
    // Only allow entries for students that are targets of this trip
    const targets = await listTripTargetsSummary(tripId);
    const targetByStudent = new Map(targets.map(t => [t.student_id, t] as const));
    const ids = filteredEntries.map(e => e.student_id);
    // First restrict to students assigned to the bus in scope
    if (driverBusId) {
      const allowed = await filterStudentsByBus(schoolId, driverBusId, ids);
      filteredEntries = filteredEntries.filter(e => allowed.has(e.student_id));
    } else {
      filteredEntries = [];
    }
    // Next restrict to those present in trip targets
    filteredEntries = filteredEntries.filter(e => targetByStudent.has(e.student_id));
    // Finally, enforce: status "present" only if target status is picked
    filteredEntries = filteredEntries.filter(e => {
      const t = targetByStudent.get(e.student_id);
      if (!t) return false;
      if ((e.status ?? 'present') === 'present') return t.status === 'picked';
      return true; // absent/late allowed regardless (but driver UI should send present/absent only)
    });
  }
  if (params.role === 'driver' && driverBusId) {
    const ids = filteredEntries.map(e => e.student_id);
    const allowed = await filterStudentsByBus(schoolId, driverBusId, ids);
    filteredEntries = filteredEntries.filter(e => allowed.has(e.student_id));
  } else if (params.role === 'admin') {
    const ids = filteredEntries.map(e => e.student_id);
    if (driverBusId) {
      const allowed = await filterStudentsByBus(schoolId, driverBusId, ids);
      filteredEntries = filteredEntries.filter(e => allowed.has(e.student_id));
    } else {
      const allowed = await filterStudentsBySchool(schoolId, ids);
      filteredEntries = filteredEntries.filter(e => allowed.has(e.student_id));
    }
  } else if (params.role === 'teacher') {
    // Teachers cannot write bus attendance; ignore
    filteredEntries = [];
  }
  const count = await upsertBusAttendance(schoolId, params.user_id, params.role, filteredEntries, driverBusId, tripId);
  return { upserted: count };
}

export async function querySchoolAttendance(params: { role: string; user_id: string; school_id?: string | null; date?: string | null; class_id?: string | null; student_id?: string | null }) {
  return listSchoolAttendance(params);
}

export async function queryBusAttendance(params: { role: string; user_id: string; school_id?: string | null; date?: string | null; bus_id?: string | null; student_id?: string | null }) {
  return listBusAttendance(params);
}
