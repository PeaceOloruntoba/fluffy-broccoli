export function initialsFromName(name: string, maxLetters = 3): string {
  const parts = name
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.map((p) => p[0]).join('').toUpperCase();
  return letters.slice(0, maxLetters);
}

function random4(): string {
  return Math.floor(1 + Math.random() * 9999)
    .toString()
    .padStart(4, '0');
}

export function generateSchoolCode(schoolName: string): string {
  const pref = initialsFromName(schoolName, 3);
  return `${pref}-${random4()}`;
}

export function generatePersonCode(prefix: 'PT' | 'TE' | 'DR', schoolCode: string, personName: string): string {
  const schoolPart = schoolCode.split('-')[0] || initialsFromName(personName, 3);
  const personInit = initialsFromName(personName, 2);
  return `${schoolPart}-${prefix}-${personInit}-${random4()}`;
}

export function generateBusCode(schoolCode: string): string {
  const schoolPart = schoolCode.split('-')[0];
  return `${schoolPart}-BUS-${random4()}`;
}

export function generateDriverCode(schoolCode: string): string {
  const schoolPart = schoolCode.split('-')[0];
  return `${schoolPart}-DRV-${random4()}`;
}
