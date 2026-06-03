// Mock data realista de vuelos — reemplaza searchFlights() cuando tengas API key real

export type FlightSegment = {
  departure: { iataCode: string; at: string; terminal?: string };
  arrival: { iataCode: string; at: string; terminal?: string };
  carrierCode: string;
  number: string;
  duration: string;
  aircraft: string;
};

export type FlightOffer = {
  id: string;
  price: { total: string; grandTotal: string; currency: string };
  itineraries: { duration: string; segments: FlightSegment[] }[];
  numberOfBookableSeats: number;
  travelerPricings: { fareDetailsBySegment: { cabin: string; includedCheckedBags: { quantity: number } }[] }[];
};

const AIRLINES: Record<string, string> = {
  AM: 'Aeroméxico', VB: 'VivaAerobus', Y4: 'Volaris', WN: 'Southwest',
  AA: 'American Airlines', UA: 'United Airlines', DL: 'Delta Air Lines',
  IB: 'Iberia', LH: 'Lufthansa', AV: 'Avianca',
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function addMinutes(date: Date, min: number) { return new Date(date.getTime() + min * 60000); }
function isoTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
function durationStr(min: number) {
  return `PT${Math.floor(min/60)}H${pad(min%60)}M`;
}

const ROUTE_DATA: Record<string, { carriers: string[]; minPrice: number; maxPrice: number; directDuration: number }> = {
  default: { carriers: ['AM','VB','Y4','AA'], minPrice: 1800, maxPrice: 12000, directDuration: 180 },
  'MEX-GDL': { carriers: ['AM','VB','Y4'], minPrice: 900, maxPrice: 3500, directDuration: 60 },
  'MEX-CUN': { carriers: ['AM','VB','Y4'], minPrice: 1200, maxPrice: 5000, directDuration: 150 },
  'MEX-MID': { carriers: ['AM','VB'], minPrice: 1100, maxPrice: 4200, directDuration: 100 },
  'GDL-CUN': { carriers: ['VB','Y4'], minPrice: 1400, maxPrice: 4800, directDuration: 135 },
  'MEX-JFK': { carriers: ['AM','AA','UA'], minPrice: 6000, maxPrice: 22000, directDuration: 330 },
  'MEX-LAX': { carriers: ['AM','AA','UA'], minPrice: 5500, maxPrice: 20000, directDuration: 300 },
  'MEX-MAD': { carriers: ['AM','IB'], minPrice: 9000, maxPrice: 35000, directDuration: 720 },
};

function routeKey(o: string, d: string) {
  const k = `${o}-${d}`;
  const r = `${d}-${o}`;
  return ROUTE_DATA[k] ? k : ROUTE_DATA[r] ? r : 'default';
}

export function mockSearchFlights(params: {
  origin: string; destination: string; departureDate: string;
  returnDate?: string; adults: number;
}): { data: FlightOffer[]; dictionaries: { carriers: Record<string,string> } } {
  const rk = routeKey(params.origin, params.destination);
  const route = ROUTE_DATA[rk];
  const depDate = new Date(`${params.departureDate}T06:00:00`);
  const offers: FlightOffer[] = [];
  const cabins = ['ECONOMY','ECONOMY','ECONOMY','PREMIUM_ECONOMY','BUSINESS'];

  for (let i = 0; i < 8; i++) {
    const carrier = route.carriers[i % route.carriers.length];
    const isDirect = i < 5;
    const depHour = 6 + i * 2;
    const dep = new Date(depDate);
    dep.setHours(depHour, [0,15,30,45][i%4], 0, 0);
    const flightMin = route.directDuration + (isDirect ? 0 : 90) + Math.floor(Math.random()*30);
    const arr = addMinutes(dep, flightMin);
    const priceBase = route.minPrice + Math.floor(Math.random() * (route.maxPrice - route.minPrice));
    const price = (priceBase * params.adults).toFixed(2);
    const cabin = cabins[i % cabins.length];
    const seats = 2 + Math.floor(Math.random() * 8);

    const segments: FlightSegment[] = isDirect
      ? [{ departure: { iataCode: params.origin, at: isoTime(dep) }, arrival: { iataCode: params.destination, at: isoTime(arr) }, carrierCode: carrier, number: String(100 + i * 37), duration: durationStr(flightMin), aircraft: 'Boeing 737' }]
      : [
          { departure: { iataCode: params.origin, at: isoTime(dep) }, arrival: { iataCode: 'MEX', at: isoTime(addMinutes(dep, route.directDuration/2)) }, carrierCode: carrier, number: String(200 + i*13), duration: durationStr(route.directDuration/2), aircraft: 'Airbus A320' },
          { departure: { iataCode: 'MEX', at: isoTime(addMinutes(dep, route.directDuration/2 + 60)) }, arrival: { iataCode: params.destination, at: isoTime(arr) }, carrierCode: carrier, number: String(300 + i*17), duration: durationStr(flightMin - route.directDuration/2 - 60), aircraft: 'Airbus A320' },
        ];

    const itineraries = [{ duration: durationStr(flightMin), segments }];

    if (params.returnDate) {
      const retDate = new Date(`${params.returnDate}T08:00:00`);
      retDate.setHours(8 + i, 0, 0, 0);
      const retMin = route.directDuration + Math.floor(Math.random()*20);
      const retArr = addMinutes(retDate, retMin);
      itineraries.push({ duration: durationStr(retMin), segments: [{ departure: { iataCode: params.destination, at: isoTime(retDate) }, arrival: { iataCode: params.origin, at: isoTime(retArr) }, carrierCode: carrier, number: String(400 + i*23), duration: durationStr(retMin), aircraft: 'Boeing 737' }] });
    }

    offers.push({
      id: `mock-${i}`,
      price: { total: price, grandTotal: price, currency: 'MXN' },
      itineraries,
      numberOfBookableSeats: seats,
      travelerPricings: Array(params.adults).fill(null).map(() => ({ fareDetailsBySegment: segments.map(() => ({ cabin, includedCheckedBags: { quantity: cabin === 'ECONOMY' ? 0 : 1 } })) })),
    });
  }

  // Ordenar por precio
  offers.sort((a, b) => Number(a.price.grandTotal) - Number(b.price.grandTotal));

  return { data: offers, dictionaries: { carriers: AIRLINES } };
}

export const MOCK_AIRPORTS: Record<string, { iataCode: string; name: string; address: { cityName: string; countryCode: string } }[]> = {
  mex: [{ iataCode: 'MEX', name: 'Aeropuerto Internacional Benito Juárez', address: { cityName: 'Ciudad de México', countryCode: 'MX' } },{ iataCode: 'NLU', name: 'Aeropuerto Internacional Felipe Ángeles', address: { cityName: 'Santa Lucía', countryCode: 'MX' } }],
  gua: [{ iataCode: 'GDL', name: 'Aeropuerto Internacional Miguel Hidalgo', address: { cityName: 'Guadalajara', countryCode: 'MX' } }],
  gdl: [{ iataCode: 'GDL', name: 'Aeropuerto Internacional Miguel Hidalgo', address: { cityName: 'Guadalajara', countryCode: 'MX' } }],
  mon: [{ iataCode: 'MTY', name: 'Aeropuerto Internacional Mariano Escobedo', address: { cityName: 'Monterrey', countryCode: 'MX' } }],
  mty: [{ iataCode: 'MTY', name: 'Aeropuerto Internacional Mariano Escobedo', address: { cityName: 'Monterrey', countryCode: 'MX' } }],
  can: [{ iataCode: 'CUN', name: 'Aeropuerto Internacional de Cancún', address: { cityName: 'Cancún', countryCode: 'MX' } }],
  cun: [{ iataCode: 'CUN', name: 'Aeropuerto Internacional de Cancún', address: { cityName: 'Cancún', countryCode: 'MX' } }],
  tij: [{ iataCode: 'TIJ', name: 'Aeropuerto Internacional Abelardo L. Rodríguez', address: { cityName: 'Tijuana', countryCode: 'MX' } }],
  los: [{ iataCode: 'LAX', name: 'Los Angeles International Airport', address: { cityName: 'Los Ángeles', countryCode: 'US' } }],
  lax: [{ iataCode: 'LAX', name: 'Los Angeles International Airport', address: { cityName: 'Los Ángeles', countryCode: 'US' } }],
  new: [{ iataCode: 'JFK', name: 'John F. Kennedy International Airport', address: { cityName: 'Nueva York', countryCode: 'US' } },{ iataCode: 'LGA', name: 'LaGuardia Airport', address: { cityName: 'Nueva York', countryCode: 'US' } },{ iataCode: 'EWR', name: 'Newark Liberty International', address: { cityName: 'Newark', countryCode: 'US' } }],
  jfk: [{ iataCode: 'JFK', name: 'John F. Kennedy International Airport', address: { cityName: 'Nueva York', countryCode: 'US' } }],
  mia: [{ iataCode: 'MIA', name: 'Miami International Airport', address: { cityName: 'Miami', countryCode: 'US' } }],
  mad: [{ iataCode: 'MAD', name: 'Aeropuerto Adolfo Suárez Madrid-Barajas', address: { cityName: 'Madrid', countryCode: 'ES' } }],
  bog: [{ iataCode: 'BOG', name: 'Aeropuerto El Dorado', address: { cityName: 'Bogotá', countryCode: 'CO' } }],
  mor: [{ iataCode: 'MLM', name: 'Aeropuerto Francisco Mujica', address: { cityName: 'Morelia', countryCode: 'MX' } }],
  mlm: [{ iataCode: 'MLM', name: 'Aeropuerto Francisco Mujica', address: { cityName: 'Morelia', countryCode: 'MX' } }],
  mid: [{ iataCode: 'MID', name: 'Aeropuerto Internacional Manuel Crescencio Rejón', address: { cityName: 'Mérida', countryCode: 'MX' } }],
};

export function mockSearchAirports(keyword: string) {
  const k = keyword.toLowerCase().slice(0, 3);
  const direct = MOCK_AIRPORTS[k] ?? [];
  if (direct.length) return { data: direct };
  // búsqueda parcial
  const results = Object.values(MOCK_AIRPORTS).flat().filter(
    (a) => a.iataCode.toLowerCase().includes(k) ||
            a.address.cityName.toLowerCase().includes(keyword.toLowerCase()) ||
            a.name.toLowerCase().includes(keyword.toLowerCase())
  );
  return { data: results.slice(0, 6) };
}
