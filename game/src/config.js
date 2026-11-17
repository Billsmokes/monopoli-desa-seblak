// Monopoli Desa Seblak — board data, card decks and tuning.
// All names, places and cards are original, invented for the fictional
// village of Desa Seblak. Nothing here copies any published board.

export const BOARD_SIZE = 40;
export const START_MONEY_QUICK = 2000;
export const START_MONEY_CLASSIC = 1500;
export const QUICK_TARGET = 4500; // first to this net worth wins Quick Match
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_TURNS_MAX = 3;
export const HOUSE_MAX = 4; // 4 houses, then a hotel as level 5

// Colour groups: id, display name, colour, house cost.
export const GROUPS = [
  { id: 0, name: 'Cireng', color: '#8d5a2b', houseCost: 50 },
  { id: 1, name: 'Combro', color: '#7ec8e3', houseCost: 50 },
  { id: 2, name: 'Bala-bala', color: '#e87ea1', houseCost: 100 },
  { id: 3, name: 'Peuyeum', color: '#f28c28', houseCost: 100 },
  { id: 4, name: 'Seblak', color: '#d64545', houseCost: 150 },
  { id: 5, name: 'Cakwe', color: '#f2d13d', houseCost: 150 },
  { id: 6, name: 'Batagor', color: '#4caf6d', houseCost: 200 },
  { id: 7, name: 'Cilok', color: '#3a5f9e', houseCost: 200 },
];

// Every square on the 40-square loop. kind: go | property | transport |
// utility | chance | community | tax | jail | parking | gotojail
// rent: base rent; rent grows with houses (see board.js).
function prop(name, group, price) {
  const rent = Math.max(5, Math.round(price / 12));
  return { kind: 'property', name, group, price, rent };
}

export const SQUARES = [
  { kind: 'go', name: 'Balai Desa', sub: 'Gaji Rp200' }, // 0
  prop('Pasar Cireng', 0, 60), // 1
  { kind: 'community', name: 'Kartu Warga', sub: 'Ambil kartu' }, // 2
  prop('Gang Baso', 0, 60), // 3
  { kind: 'tax', name: 'Pajak Desa', sub: 'Bayar Rp200', amount: 200 }, // 4
  { kind: 'transport', name: 'Angkot Cireng', price: 200 }, // 5
  prop('Sawah Combro', 1, 100), // 6
  { kind: 'chance', name: 'Kartu Kejutan Desa', sub: 'Ambil kartu' }, // 7
  prop('Kebun Singkong', 1, 100), // 8
  prop('Kolam Lele', 1, 120), // 9
  { kind: 'jail', name: 'Pos Ronda', sub: 'Mampir / ditahan' }, // 10
  prop('Jalan Karedok', 2, 140), // 11
  { kind: 'utility', name: 'Sumur Bor', price: 150 }, // 12
  prop('Lapangan Bala-bala', 2, 140), // 13
  prop('Taman Bala-bala', 2, 160), // 14
  { kind: 'transport', name: 'Angkot Combro', price: 200 }, // 15
  prop('Bukit Peuyeum', 3, 180), // 16
  { kind: 'community', name: 'Kartu Warga', sub: 'Ambil kartu' }, // 17
  prop('Waduk Peuyeum', 3, 180), // 18
  prop('Alun-alun Surabi', 3, 200), // 19
  { kind: 'parking', name: 'Alun-alun', sub: 'Istirahat' }, // 20
  prop('Toko Seblak', 4, 220), // 21
  { kind: 'chance', name: 'Kartu Kejutan Desa', sub: 'Ambil kartu' }, // 22
  prop('Terminal Odading', 4, 220), // 23
  prop('Pabrik Kerupuk', 4, 240), // 24
  { kind: 'transport', name: 'Angkot Batagor', price: 200 }, // 25
  prop('Stasiun Cakwe', 5, 260), // 26
  prop('Klinik Desa', 5, 260), // 27
  { kind: 'utility', name: 'Listrik Desa', price: 150 }, // 28
  prop('Perumahan Combro', 5, 280), // 29
  { kind: 'gotojail', name: 'Kena Razia!', sub: 'Ke Pos Ronda' }, // 30
  prop('Jembatan Batagor', 6, 300), // 31
  prop('Sungai Cilok', 6, 300), // 32
  { kind: 'community', name: 'Kartu Warga', sub: 'Ambil kartu' }, // 33
  prop('Pasar Malam Cilok', 6, 320), // 34
  { kind: 'transport', name: 'Angkot Cilok', price: 200 }, // 35
  { kind: 'chance', name: 'Kartu Kejutan Desa', sub: 'Ambil kartu' }, // 36
  prop('Bukit Cireng', 7, 350), // 37
  { kind: 'tax', name: 'Retribusi Pasar', sub: 'Bayar Rp100', amount: 100 }, // 38
  prop('Balai Seblak Raya', 7, 400), // 39
];

// Squares of each colour group, for set checks.
export const GROUP_SQUARES = {};
for (let i = 0; i < SQUARES.length; i++) {
  const sq = SQUARES[i];
  if (sq.kind === 'property') (GROUP_SQUARES[sq.group] ??= []).push(i);
}

export const TRANSPORT_SQUARES = [5, 15, 25, 35];
export const UTILITY_SQUARES = [12, 28];

// Chance deck: Kartu Kejutan Desa.
export const CHANCE_CARDS = [
  { title: 'Panen Raya!', text: 'Panen combro melimpah. Terima Rp150 dari bank.', effect: { type: 'money', amount: 150 } },
  { title: 'Ban Bocor', text: 'Angkotmu bocor di tengah jalan. Bayar servis Rp50.', effect: { type: 'money', amount: -50 } },
  { title: 'Dipanggil Pak Kades', text: 'Maju ke Balai Desa dan terima gaji.', effect: { type: 'goto', square: 0 } },
  { title: 'Belanja ke Pasar', text: 'Maju ke Pasar Cireng. Kalau lewat Balai Desa, terima gaji.', effect: { type: 'goto', square: 1 } },
  { title: 'Kena Razia!', text: 'Tidak bawa KTP desa. Langsung ke Pos Ronda!', effect: { type: 'jail' } },
  { title: 'Juara Lomba Masak', text: 'Seblakmu juara satu! Hadiah Rp100.', effect: { type: 'money', amount: 100 } },
  { title: 'Iuran Kebersihan', text: 'Bayar iuran kebersihan desa Rp30.', effect: { type: 'money', amount: -30 } },
  { title: 'Jalan Pintas', text: 'Lewat gang belakang. Maju 3 langkah.', effect: { type: 'move', steps: 3 } },
  { title: 'Jalan Buntu', text: 'Jalan ditutup hajatan. Mundur 2 langkah.', effect: { type: 'move', steps: -2 } },
  { title: 'THR dari Pak Kades', text: 'Pak Kades bagi-bagi THR. Terima Rp75.', effect: { type: 'money', amount: 75 } },
  { title: 'Atap Bocor', text: 'Hujan deras, atap bocor. Perbaiki Rp80.', effect: { type: 'money', amount: -80 } },
  { title: 'Piknik ke Alun-alun', text: 'Maju ke Alun-alun, istirahat sejenak.', effect: { type: 'goto', square: 20 } },
];

// Community deck: Kartu Warga.
export const COMMUNITY_CARDS = [
  { title: 'Gotong Royong', text: 'Warga patungan untukmu. Setiap pemain membayar Rp25.', effect: { type: 'collectAll', amount: 25 } },
  { title: 'Iuran RT', text: 'Bayar iuran RT bulan ini Rp40.', effect: { type: 'money', amount: -40 } },
  { title: 'Menang Arisan', text: 'Namamu keluar di arisan! Terima Rp120.', effect: { type: 'money', amount: 120 } },
  { title: 'Bantu Tetangga', text: 'Bantu tetangga pindahan. Ongkos Rp25.', effect: { type: 'money', amount: -25 } },
  { title: 'Dana Desa Cair', text: 'Dana desa cair untuk wargamu. Terima Rp200.', effect: { type: 'money', amount: 200 } },
  { title: 'Sumbangan Masjid', text: 'Sumbangan pembangunan masjid Rp50.', effect: { type: 'money', amount: -50 } },
  { title: 'Jualan Pasar Malam', text: 'Jualan cireng di pasar malam laris! Terima Rp90.', effect: { type: 'money', amount: 90 } },
  { title: 'Denda Sampah', text: 'Buang sampah sembarangan. Denda Rp20.', effect: { type: 'money', amount: -20 } },
  { title: 'Juara Kebersihan', text: 'Gangmu juara lomba kebersihan! Hadiah Rp60.', effect: { type: 'money', amount: 60 } },
  { title: 'Bayar Listrik Desa', text: 'Tagihan listrik desa Rp35.', effect: { type: 'money', amount: -35 } },
  { title: 'Panen Singkong', text: 'Panen singkong melimpah. Terima Rp80.', effect: { type: 'money', amount: 80 } },
  { title: 'Surat Bebas Ronda', text: 'Dapat surat bebas dari Pos Ronda. Simpan untuk nanti!', effect: { type: 'jailCard' } },
];

export const PLAYER_DEFS = [
  { name: 'Kamu', token: 'chilli', color: '#d64545', human: true },
  { name: 'Pak Darma', token: 'coin', color: '#e8a13a', human: false },
  { name: 'Bu Ratna', token: 'lantern', color: '#2f7f7a', human: false },
  { name: 'Mang Udin', token: 'cat', color: '#7a5fc0', human: false },
];

export const PALETTE = {
  cream: '#f7ead0',
  board: '#fdf6e3',
  ink: '#3b2f23',
  terracotta: '#c96f3f',
  green: '#5a8f4d',
  teal: '#2f7f7a',
  gold: '#e8b23a',
  panel: '#fff8e7',
  line: '#b99b6b',
};
