import { getDriverScopeByUser, getAdminSchoolId, createTripWithTargets, insertLocations, patchTargetStatus, setTripEnded, findRunningTripForBus, getLiveForSchool, getLiveForParent, getSchoolCoords, getTripTargetsForOrdering, bulkUpdateTargetOrder, type TripDirection } from './repo.js';
import { handleLocationPingForReminders } from '../notifications/service.js';

export async function startTrip(params: { user_id: string; role: string; direction: TripDirection; route_name?: string }) {
  if (params.role !== 'driver') throw new Error('forbidden');
  const scope = await getDriverScopeByUser(params.user_id);
  if (!scope) throw new Error('driver_scope_not_found');
  // Ensure only one running trip per bus
  const running = await findRunningTripForBus(scope.school_id, scope.bus_id);
  if (running) throw new Error('trip_already_running');
  const { trip_id } = await createTripWithTargets({
    school_id: scope.school_id,
    bus_id: scope.bus_id,
    driver_id: scope.driver_id,
    direction: params.direction,
    route_name: params.route_name ?? null,
    started_by_user_id: params.user_id
  });
  // Compute nearest-neighbor ordering from school coordinates
  const school = await getSchoolCoords(scope.school_id);
  const targets = await getTripTargetsForOrdering(trip_id);
  if (!school || targets.length === 0) {
    return { trip_id, targets: targets.map((t, idx) => ({ target_id: t.id, student_id: t.student_id, name: t.name, lat: t.lat, lng: t.lng, order_index: idx + 1 })) };
  }
  const ordered: typeof targets = [];
  const remaining = [...targets];
  let currLat = school.latitude;
  let currLng = school.longitude;
  const dist = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2));
    return R * c;
  };
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestD = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      const d = dist(currLat, currLng, r.lat, r.lng);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    currLat = next.lat; currLng = next.lng;
  }
  const toPersist = ordered.map((t, idx) => ({ id: t.id, order_index: idx + 1 }));
  await bulkUpdateTargetOrder(trip_id, toPersist);
  return { trip_id, targets: ordered.map((t, idx) => ({ target_id: t.id, student_id: t.student_id, name: t.name, lat: t.lat, lng: t.lng, order_index: idx + 1 })) };
}

export async function addLocations(params: { user_id: string; role: string; trip_id: string; points: Array<{ lat: number; lng: number; recorded_at?: string | null; speed_kph?: number | null; heading?: number | null; accuracy_m?: number | null }> }) {
  // Driver can post for own running trip; admin may post on behalf (optional later). For now, restrict to driver.
  if (params.role !== 'driver') throw new Error('forbidden');
  const count = await insertLocations({ trip_id: params.trip_id, points: params.points });
  // Fire-and-forget reminder evaluation (no await to keep ingestion fast)
  handleLocationPingForReminders({ trip_id: params.trip_id, points: params.points.map(p => ({ lat: p.lat, lng: p.lng, recorded_at: p.recorded_at ?? null })) }).catch(() => {});
  return { inserted: count };
}

export async function updateTargetStatus(params: { user_id: string; role: string; trip_id: string; target_id: string; status: 'picked'|'dropped'|'skipped' }) {
  if (params.role !== 'driver') throw new Error('forbidden');
  const ok = await patchTargetStatus({ trip_id: params.trip_id, target_id: params.target_id, status: params.status });
  if (!ok) throw new Error('target_not_found');
  return { updated: true };
}

export async function endTrip(params: { user_id: string; role: string; trip_id: string }) {
  if (params.role !== 'driver' && params.role !== 'admin' && params.role !== 'superadmin') throw new Error('forbidden');
  await setTripEnded({ trip_id: params.trip_id, ended_by_user_id: params.user_id });
  return { ended: true };
}

export async function getLiveView(params: { user_id: string; role: string; query: { school_id?: string; class_only?: string } }) {
  if (params.role === 'superadmin') {
    const schoolId = params.query.school_id;
    if (!schoolId) return [];
    return getLiveForSchool(schoolId);
  }
  if (params.role === 'admin') {
    const schoolId = await getAdminSchoolId(params.user_id);
    if (!schoolId) return [];
    return getLiveForSchool(schoolId);
  }
  if (params.role === 'teacher') {
    // MVP: show the school's live; optional class-only filter can be implemented later
    const schoolId = await getAdminSchoolId(params.user_id);
    if (!schoolId) return [];
    return getLiveForSchool(schoolId);
  }
  if (params.role === 'driver') {
    const scope = await getDriverScopeByUser(params.user_id);
    if (!scope) return [];
    return getLiveForSchool(scope.school_id);
  }
  if (params.role === 'parent') {
    const mine = await getLiveForParent(params.user_id);
    return mine ? [mine] : [];
  }
  return [];
}

export async function getLiveMine(params: { user_id: string; role: string }) {
  if (params.role !== 'parent') throw new Error('forbidden');
  const mine = await getLiveForParent(params.user_id);
  return mine ?? null;
}
