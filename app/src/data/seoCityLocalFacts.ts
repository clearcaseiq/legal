/**
 * Local detail for the city car accident pages.
 *
 * Those pages are generated from a shared template with the city name
 * interpolated, which left them roughly 70-80% identical to one another. Pages
 * that differ only by a swapped place name are what Google describes as
 * doorway pages, so each city needs material that is actually specific to it:
 * where a case is filed, the corridors where these crashes happen, and which
 * local public agencies carry a shorter claim deadline than a private driver.
 *
 * The government claim point is the most useful of these. A collision with a
 * city bus or other public entity vehicle is governed by a claim deadline far
 * shorter than the ordinary personal injury limit, so naming the local agencies
 * is both genuinely local and genuinely actionable.
 *
 * Verify venue and agency details with counsel before launch; courts
 * reorganise divisions and transit operators change names.
 */
export type CityLocalFacts = {
  city: string
  county: string
  /** Superior court where a civil case for this city is generally filed. */
  court: string
  /** Named roadways that generate most of the serious collisions locally. */
  corridors: string[]
  /** Local public entities whose vehicles carry a shorter claim deadline. */
  publicAgencies: string[]
  /** What makes claims here different from the rest of California. */
  localProfile: string
}

export const cityLocalFacts: Record<string, CityLocalFacts> = {
  '/los-angeles-car-accident': {
    city: 'Los Angeles',
    county: 'Los Angeles County',
    court: 'Los Angeles County Superior Court, with most downtown civil matters at the Stanley Mosk Courthouse',
    corridors: ['I-405', 'I-10', 'US-101', 'I-110', 'I-5'],
    publicAgencies: ['LA Metro buses and rail', 'LADOT DASH and Commuter Express', 'City of Los Angeles vehicles'],
    localProfile:
      'Los Angeles combines the highest rideshare and delivery density in the state with heavy commercial fleet traffic and long freeway commutes. Crashes frequently involve a driver working for a company at the time, which opens commercial or rideshare policies well above a personal auto limit and changes how the claim is evaluated.',
  },
  '/orange-county-car-accident': {
    city: 'Orange County',
    county: 'Orange County',
    court: 'Orange County Superior Court, with civil matters generally at the Central Justice Center in Santa Ana',
    corridors: ['I-405', 'I-5', 'SR-55', 'SR-22', 'SR-91'],
    publicAgencies: ['OCTA buses', 'City vehicles for Santa Ana, Irvine, Anaheim and neighbouring cities'],
    localProfile:
      'Orange County claims often pair high medical billing with insurers who scrutinise soft-tissue injuries closely. Treatment cost alone rarely carries a claim here; continuity of care, imaging, and a clean causation record tend to matter more than the size of the bill.',
  },
  '/san-diego-car-accident': {
    city: 'San Diego',
    county: 'San Diego County',
    court: 'San Diego County Superior Court, with downtown civil matters at the Hall of Justice',
    corridors: ['I-5', 'I-8', 'I-15', 'SR-163', 'SR-52'],
    publicAgencies: ['San Diego MTS buses and trolley', 'North County Transit District', 'City of San Diego vehicles'],
    localProfile:
      'San Diego adds two wrinkles seen less often elsewhere: active-duty military claimants whose care runs through military treatment facilities rather than civilian providers, and border-region traffic that can involve out-of-state or foreign policies. Both affect how records are gathered and which coverage actually responds.',
  },
  '/san-francisco-car-accident': {
    city: 'San Francisco',
    county: 'San Francisco County',
    court: 'Superior Court of California, County of San Francisco, at the Civic Center Courthouse',
    corridors: ['US-101', 'I-80 and the Bay Bridge approach', 'Market Street', 'Van Ness Avenue', 'Lombard Street'],
    publicAgencies: ['SFMTA and Muni', 'BART', 'City and County of San Francisco vehicles'],
    localProfile:
      'A large share of serious San Francisco cases involve pedestrians and cyclists rather than two vehicles, and Muni is a frequent party. Because the city and its transit agency are public entities, the shortened government claim deadline applies far more often here than in most California cities.',
  },
  '/sacramento-car-accident': {
    city: 'Sacramento',
    county: 'Sacramento County',
    court: 'Sacramento County Superior Court, with civil matters at the Gordon D. Schaber Downtown Courthouse',
    corridors: ['I-5', 'I-80', 'US-50', 'SR-99', 'Business 80'],
    publicAgencies: ['Sacramento Regional Transit', 'State of California fleet vehicles', 'City and County of Sacramento vehicles'],
    localProfile:
      'As the state capital, Sacramento sees a higher-than-usual share of collisions involving state government fleet vehicles. A claim against a state agency follows a different process and a much shorter deadline than a claim against a private driver, so identifying the owner of the other vehicle early matters more here.',
  },
  '/san-jose-car-accident': {
    city: 'San Jose',
    county: 'Santa Clara County',
    court: 'Santa Clara County Superior Court, with civil matters at the Downtown Superior Court',
    corridors: ['US-101', 'I-280', 'I-880', 'SR-87', 'SR-85'],
    publicAgencies: ['VTA buses and light rail', 'City of San Jose vehicles'],
    localProfile:
      'Wage loss is often the largest single component of a San Jose claim. Technology compensation frequently includes equity and bonus structures that a standard lost-wage calculation misses entirely, so documenting total compensation rather than base salary can materially change the economics.',
  },
  '/long-beach-car-accident': {
    city: 'Long Beach',
    county: 'Los Angeles County',
    court: 'Los Angeles County Superior Court, with local civil matters at the Governor George Deukmejian Courthouse',
    corridors: ['I-710', 'I-405', 'SR-91', 'SR-22', 'Pacific Coast Highway'],
    publicAgencies: ['Long Beach Transit', 'LA Metro', 'City of Long Beach vehicles'],
    localProfile:
      'The Port of Long Beach pushes constant heavy truck traffic down the I-710 corridor. Commercial trucking cases run on different rules from ordinary car accidents: higher policy limits, federal driver and maintenance records, and evidence that can be lost quickly if it is not preserved early.',
  },
  '/anaheim-car-accident': {
    city: 'Anaheim',
    county: 'Orange County',
    court: 'Orange County Superior Court, with civil matters generally at the Central Justice Center in Santa Ana',
    corridors: ['I-5', 'SR-91', 'SR-57', 'SR-55', 'Katella Avenue'],
    publicAgencies: ['OCTA buses', 'Anaheim Resort Transportation', 'City of Anaheim vehicles'],
    localProfile:
      'Anaheim mixes resort district traffic with unfamiliar visiting drivers, tour buses, and a high volume of pedestrians near the convention and theme park corridors. Out-of-state drivers and rental vehicles are common, which complicates identifying which policy actually covers the loss.',
  },
  '/irvine-car-accident': {
    city: 'Irvine',
    county: 'Orange County',
    court: 'Orange County Superior Court, with civil matters generally at the Central Justice Center in Santa Ana',
    corridors: ['I-405', 'I-5', 'SR-133', 'SR-73', 'SR-261'],
    publicAgencies: ['OCTA buses', 'iShuttle', 'City of Irvine vehicles'],
    localProfile:
      'Irvine crashes concentrate on wide arterial intersections and toll-road interchanges rather than dense city streets, which often means higher speeds and more serious injuries. Claimants here also tend to have employer health coverage, so reimbursement liens frequently reduce the net recovery and should be tracked from the start.',
  },
  '/riverside-car-accident': {
    city: 'Riverside',
    county: 'Riverside County',
    court: 'Riverside County Superior Court, with civil matters at the Riverside Historic Courthouse',
    corridors: ['SR-91', 'I-215', 'I-15', 'SR-60'],
    publicAgencies: ['Riverside Transit Agency', 'City of Riverside and County of Riverside vehicles'],
    localProfile:
      'The Inland Empire carries some of the longest commutes and heaviest freight traffic in the state, and SR-91 in particular produces high-speed multi-vehicle collisions. Warehouse and distribution trucking is a frequent factor, which brings commercial coverage and federal record-keeping into play.',
  },
  '/oakland-car-accident': {
    city: 'Oakland',
    county: 'Alameda County',
    court: 'Alameda County Superior Court, with civil matters at the René C. Davidson Courthouse',
    corridors: ['I-880', 'I-580', 'I-980', 'I-80', 'International Boulevard'],
    publicAgencies: ['AC Transit', 'BART', 'City of Oakland vehicles'],
    localProfile:
      'Port of Oakland drayage traffic keeps heavy trucks on I-880 at all hours, and the corridor has a long record of severe collisions. Oakland also sees a high proportion of pedestrian and cyclist injuries on major arterials, where liability disputes often turn on signal timing, lighting, and roadway design.',
  },
  '/fresno-car-accident': {
    city: 'Fresno',
    county: 'Fresno County',
    court: 'Fresno County Superior Court, with civil matters at the B.F. Sisk Courthouse',
    corridors: ['SR-99', 'SR-41', 'SR-168', 'I-5 west of the city'],
    publicAgencies: ['Fresno Area Express', 'City of Fresno and County of Fresno vehicles'],
    localProfile:
      'Central Valley claims regularly involve agricultural equipment, farm labour transport, and long-haul trucking on SR-99, one of the most collision-prone highways in California. Rural crash sites can also mean longer emergency response times and a treatment record that starts at a regional trauma centre far from home.',
  },
  '/bakersfield-car-accident': {
    city: 'Bakersfield',
    county: 'Kern County',
    court: 'Kern County Superior Court, which hears civil matters for the Bakersfield area',
    corridors: ['SR-99', 'SR-58', 'SR-178', 'I-5 west of the city'],
    publicAgencies: ['Golden Empire Transit', 'City of Bakersfield and County of Kern vehicles'],
    localProfile:
      'Oilfield service trucks and agricultural haulers make up an unusually large share of Bakersfield collisions. When the other driver was working, the employer’s commercial policy and its safety and maintenance records usually matter more to the outcome than the driver’s own insurance.',
  },
}

export const cityLocalFactsSlugs = Object.keys(cityLocalFacts)
