const fs = require('fs');
const path = require('path');

const stations = [
  {
    id: '26936b4e-4ddf-11f1-b6f1-1063386df78e',
    abbrev: 'IP',
    acc: 3,
    tariffAuto: 0.48,
    tariffBici: 0.28,
    tariffMono: 0.32,
    units: [
      { kind: 'auto', label: 'Auto 1', points: { auto: 2 } },
      { kind: 'auto', label: 'Auto 2', points: { auto: 2 } },
      { kind: 'micromob', label: 'Bici/Mono', points: { bici: 2, monopattino: 1 } },
    ],
  },
  {
    id: '26936b4f-4ddf-11f1-b6f1-1063386df78e',
    abbrev: 'EST',
    acc: 1,
    tariffAuto: 0.5,
    tariffBici: 0.3,
    tariffMono: 0.34,
    units: [{ kind: 'micromob', label: 'Bici/Mono', points: { bici: 2, monopattino: 2 } }],
  },
  {
    id: '26936b50-4ddf-11f1-b6f1-1063386df78e',
    abbrev: 'OVE',
    acc: 1,
    tariffAuto: 0.49,
    tariffBici: 0.29,
    tariffMono: 0.33,
    units: [{ kind: 'auto', label: 'Auto 1', points: { auto: 3 } }],
  },
  {
    id: '26936b51-4ddf-11f1-b6f1-1063386df78e',
    abbrev: 'AVE',
    acc: 3,
    tariffAuto: 0.51,
    tariffBici: 0.31,
    tariffMono: 0.35,
    units: [
      { kind: 'auto', label: 'Auto 1', points: { auto: 2 } },
      { kind: 'auto', label: 'Auto 2', points: { auto: 1 } },
      { kind: 'micromob', label: 'Bici/Mono', points: { bici: 2, monopattino: 2 } },
    ],
  },
  {
    id: '26936b52-4ddf-11f1-b6f1-1063386df78e',
    abbrev: 'GIA',
    acc: 2,
    tariffAuto: 0.49,
    tariffBici: 0.29,
    tariffMono: 0.33,
    units: [
      { kind: 'auto', label: 'Auto 1', points: { auto: 2 } },
      { kind: 'micromob', label: 'Bici/Mono', points: { bici: 1, monopattino: 1 } },
    ],
  },
];

const typeMeta = {
  auto: { conn: 'CCS2', kw: 22.0 },
  bici: { conn: 'USB-C', kw: 3.5 },
  monopattino: { conn: 'USB-C', kw: 2.5 },
};

const now = '2026-05-23 10:00:00';
const accIns = [];
const puntiIns = [];
let accIdx = 0;
let puntoIdx = 0;

for (const st of stations) {
  if (st.units.length !== st.acc) {
    throw new Error(`Config ${st.abbrev}: attesi ${st.acc} accumulatori, definiti ${st.units.length}`);
  }

  for (const unit of st.units) {
    accIdx += 1;
    const accId = `acc00000-0000-4000-8000-${String(accIdx).padStart(12, '0')}`;
    const nomeAcc =
      unit.kind === 'auto'
        ? `Accumulatore ${unit.label} - ${st.abbrev}`
        : `Accumulatore ${unit.label} - ${st.abbrev}`;

    accIns.push(
      `('${accId}','${st.id}','${nomeAcc}',80.00,72.00,50.00,40.00,60.00,83.33,'attivo','${now}',15.00,95.00)`
    );

    const tariffs = {
      auto: st.tariffAuto,
      bici: st.tariffBici,
      monopattino: st.tariffMono,
    };

    for (const [tipo, count] of Object.entries(unit.points)) {
      const meta = typeMeta[tipo];
      const tariff = tariffs[tipo].toFixed(4);
      const letter = tipo === 'auto' ? 'A' : tipo === 'bici' ? 'B' : 'C';
      const accNum = unit.label.replace(/\D/g, '') || String(accIdx);

      for (let n = 1; n <= count; n++) {
        puntoIdx += 1;
        const pId = `punto000-0000-4000-8000-${String(puntoIdx).padStart(12, '0')}`;
        const ident = `${st.abbrev}-${unit.kind === 'auto' ? 'AU' : 'BM'}${accNum}-${letter}${n}`;
        puntiIns.push(
          `('${pId}','${st.id}','${accId}','${ident}','${tipo}','${meta.conn}',${meta.kw.toFixed(2)},'online','${now}',${tariff},'APP,RFID,QR')`
        );
      }
    }
  }
}

const out = path.join(__dirname, '..', '_seed_fragments.sql');
fs.writeFileSync(
  out,
  `-- generated: ${accIns.length} accumulatori, ${puntiIns.length} punti (no tariffe_orarie)\n\n` +
    `INSERT accumulatori:\n${accIns.join(',\n')};\n\n` +
    `INSERT punti:\n${puntiIns.join(',\n')};\n`
);
console.log(`Wrote ${out} (${accIns.length} acc, ${puntiIns.length} punti)`);
