import { Contact } from '../types/contact';

const DEMO_TEMPLATES = [
  {
    name: 'Maya Chen', title: 'Growth Marketing Lead', company: 'Northline Studio',
    phone: '+1 (415) 555-0182', email: 'maya@northline.studio', website: 'https://northline.studio',
    address: '1450 Mission St, San Francisco, CA', notes: 'Met at ProductCon. Interested in creator partnerships.',
    category: 'business',
  },
  {
    name: 'Jordan Ellis', title: 'Founder & CEO', company: 'Sphere Labs',
    phone: '+1 (323) 555-0119', email: 'jordan@spherelabs.io', website: 'https://spherelabs.io',
    address: '8800 Sunset Blvd, Los Angeles, CA', notes: 'Needs pilot rollout in Q2.',
    category: 'business',
  },
  {
    name: 'Priya Raman', title: 'Head of Partnerships', company: 'Bluepeak Health',
    phone: '+1 (646) 555-0128', email: 'priya.raman@bluepeakhealth.com', website: 'https://bluepeakhealth.com',
    address: '501 Madison Ave, New York, NY', notes: 'Potential enterprise referral channel.',
    category: 'medical',
  },
  {
    name: 'Ethan Brooks', title: 'Senior Product Designer', company: 'Arcfield Digital',
    phone: '+1 (312) 555-0164', email: 'ethan@arcfield.digital', website: 'https://arcfield.digital',
    address: '311 W Monroe St, Chicago, IL', notes: 'Wants cleaner onboarding flow and prototype review.',
    category: 'business',
  },
  {
    name: 'Sofia Alvarez', title: 'Commercial Real Estate Agent', company: 'Harbor Point Realty',
    phone: '+1 (713) 555-0175', email: 'sofia@harborpointrealty.com', website: 'https://harborpointrealty.com',
    address: '2100 West Loop S, Houston, TX', notes: 'Shared 3 office space options downtown.',
    category: 'realestate',
  },
  {
    name: 'Noah Kim', title: 'VP of Operations', company: 'Clearway Logistics',
    phone: '+1 (206) 555-0142', email: 'noah.kim@clearwaylogistics.co', website: 'https://clearwaylogistics.co',
    address: '1001 4th Ave, Seattle, WA', notes: 'Requested integration timeline and pricing sheet.',
    category: 'transport',
  },
  {
    name: 'Isabelle Fontaine', title: 'Head Florist & Owner', company: 'Maison des Fleurs',
    phone: '+1 (212) 555-0188', email: 'isabelle@maisondfleurs.com', website: 'https://maisondfleurs.com',
    address: '74 W 68th St, New York, NY', notes: 'Does large hotel lobby arrangements and event installs.',
    category: 'florists',
  },
  {
    name: 'Marcus Delgado', title: 'Executive Chef & Catering Director', company: 'Delgado Culinary Group',
    phone: '+1 (305) 555-0133', email: 'marcus@delgadoculinary.com', website: 'https://delgadoculinary.com',
    address: '420 Brickell Ave, Miami, FL', notes: 'Handles private events up to 500 guests. 4-week lead time.',
    category: 'food',
  },
  {
    name: 'Serena Park', title: 'Luxury Transportation Manager', company: 'Elite Chauffeur Services',
    phone: '+1 (310) 555-0166', email: 'serena@elitechauffeur.com', website: 'https://elitechauffeur.com',
    address: '9300 Wilshire Blvd, Beverly Hills, CA', notes: 'Fleet of 12 black vehicles. Airport, events, VIP transfers.',
    category: 'transport',
  },
  {
    name: 'James Okafor', title: 'Event Producer', company: 'Grand Events Co.',
    phone: '+1 (718) 555-0144', email: 'james@grandevents.co', website: 'https://grandevents.co',
    address: '150 W 25th St, New York, NY', notes: 'Full-service event production. Does galas, corporate, weddings.',
    category: 'events',
  },
];

export function generateDemoContacts(): Contact[] {
  const now = Date.now();
  return DEMO_TEMPLATES.map((t, i) => ({
    ...t,
    id: `demo-${i}-${now}`,
    createdAt: new Date(now - i * 86400000).toISOString(),
  }));
}
