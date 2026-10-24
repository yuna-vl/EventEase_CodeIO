/**
 * High-quality curated event imagery and category metadata
 * Configured specifically for college, tech, and cultural events.
 */

export const CATEGORIES = [
  "All",
  "Hackathons",
  "Workshops",
  "Competitions",
  "Volunteering",
  "Talks & Seminars",
  "Orientation",
  "Recruitment & Auditions",
  "Career & Placements",
  "Cultural",
  "Fests",
  "Sports",
  "Gaming & e-sports"
];

// Curated high-resolution Unsplash event photos with rich lighting and atmosphere for each category
const EVENT_PHOTOS = {
  hackathons: [
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80", // Hackathon coders at night
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80", // Collaborative tech workspace
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80"  // Hacker team building prototype
  ],
  workshops: [
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80", // Learning design sprint
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80", // Hands-on workshop session
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80"  // Tech lab demonstration
  ],
  competitions: [
    "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=800&q=80", // Trophy podium achievement
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80", // Competitive arena contest
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80"  // Contest challenge stage
  ],
  volunteering: [
    "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=800&q=80", // Volunteers hands together
    "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80", // Community support & giving
    "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80"  // Teamwork volunteer project
  ],
  talks: [
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80", // Keynote speaker on stage
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80", // Auditorium technical seminar
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80"  // Panel discussion session
  ],
  orientation: [
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80", // Students welcome induction
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80", // Campus orientation ceremony
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80"  // Freshers greeting hall
  ],
  recruitment: [
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80", // Audition interview panel
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80", // Club recruitment interview
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"  // Candidate assessment desk
  ],
  career: [
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80", // Corporate placement fair
    "https://images.unsplash.com/photo-1560523159-4a9692d222ef?auto=format&fit=crop&w=800&q=80", // Career opportunities booth
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80"  // Placement drive interview
  ],
  cultural: [
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80", // Dance cultural performance
    "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=800&q=80", // Stage drama & theatre
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"  // Musical night stage
  ],
  fests: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80", // Grand fest crowd & lights
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80", // Campus celebration evening
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80"  // DJ fest dance floor
  ],
  sports: [
    "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80", // Stadium athletics match
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80", // Track race runners
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80"  // Football tournament match
  ],
  gaming: [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80", // Esports gaming arena
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80", // RGB tournament setup
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80"  // LAN gaming tournament
  ]
};

// Fallback high quality event imagery
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80";

/**
 * Derives rich presentation metadata (Category, Image, Price Display, Tag)
 * Rules:
 * - If event.bannerUrl is uploaded: image is event.bannerUrl, hasBanner: true
 * - If no banner uploaded: image is null, hasBanner: false (no fallback images or placeholders)
 * - Registration price: For paid events with price ₹500, displays "₹500". For free events, displays "FREE".
 */
export function getEventVisual(event) {
  if (!event) {
    return {
      image: null,
      hasBanner: false,
      category: "Talks & Seminars",
      priceDisplay: "FREE",
      priceAmount: 0,
      tag: "Live"
    };
  }

  const text = `${event.title || ""} ${event.description || ""} ${event.venue || ""}`.toLowerCase();

  let category = "Talks & Seminars";
  let tag = "Keynote";

  // 1. Hackathons
  if (
    text.includes("hackathon") ||
    text.includes("hack") ||
    text.includes("antigravity") ||
    text.includes("code jam") ||
    text.includes("build with") ||
    text.includes("ideathon")
  ) {
    category = "Hackathons";
    tag = "24h Sprint";
  }
  // 2. Gaming & e-sports
  else if (
    text.includes("gaming") ||
    text.includes("esport") ||
    text.includes("e-sport") ||
    text.includes("lan") ||
    text.includes("bgmi") ||
    text.includes("valorant") ||
    text.includes("fifa") ||
    text.includes("game")
  ) {
    category = "Gaming & e-sports";
    tag = "LAN Tournament";
  }
  // 3. Workshops
  else if (
    text.includes("workshop") ||
    text.includes("bootcamp") ||
    text.includes("hands-on") ||
    text.includes("training") ||
    text.includes("masterclass")
  ) {
    category = "Workshops";
    tag = "Hands-on";
  }
  // 4. Competitions
  else if (
    text.includes("competition") ||
    text.includes("contest") ||
    text.includes("challenge") ||
    text.includes("quiz") ||
    text.includes("olympiad")
  ) {
    category = "Competitions";
    tag = "Trophy & Prizes";
  }
  // 5. Volunteering
  else if (
    text.includes("volunteer") ||
    text.includes("social") ||
    text.includes("charity") ||
    text.includes("donation") ||
    text.includes("ngo") ||
    text.includes("community drive")
  ) {
    category = "Volunteering";
    tag = "Social Cause";
  }
  // 6. Recruitment & Auditions
  else if (
    text.includes("recruitment") ||
    text.includes("audition") ||
    text.includes("interview") ||
    text.includes("tryout") ||
    text.includes("hiring")
  ) {
    category = "Recruitment & Auditions";
    tag = "Audition";
  }
  // 7. Career & Placements
  else if (
    text.includes("career") ||
    text.includes("placement") ||
    text.includes("internship") ||
    text.includes("job fair") ||
    text.includes("resume")
  ) {
    category = "Career & Placements";
    tag = "Placement Drive";
  }
  // 8. Orientation
  else if (
    text.includes("orientation") ||
    text.includes("induction") ||
    text.includes("freshers") ||
    text.includes("welcome")
  ) {
    category = "Orientation";
    tag = "Induction";
  }
  // 9. Cultural
  else if (
    text.includes("cultural") ||
    text.includes("dance") ||
    text.includes("drama") ||
    text.includes("theatre") ||
    text.includes("music") ||
    text.includes("art") ||
    text.includes("concert")
  ) {
    category = "Cultural";
    tag = "Live Stage";
  }
  // 10. Fests
  else if (
    text.includes("fest") ||
    text.includes("carnival") ||
    text.includes("celebration") ||
    text.includes("gala")
  ) {
    category = "Fests";
    tag = "Annual Fest";
  }
  // 11. Sports
  else if (
    text.includes("sport") ||
    text.includes("marathon") ||
    text.includes("cup") ||
    text.includes("cricket") ||
    text.includes("football") ||
    text.includes("badminton")
  ) {
    category = "Sports";
    tag = "Championship";
  }
  // 12. Talks & Seminars (Default)
  else {
    category = "Talks & Seminars";
    tag = "Keynote";
  }

  // Banner image resolution: only display if admin uploaded an actual banner
  const hasBanner = Boolean(event.bannerUrl && String(event.bannerUrl).trim().length > 0);
  const image = hasBanner ? String(event.bannerUrl).trim() : null;

  // Strict INR / FREE pricing resolution
  let priceDisplay = "FREE";
  let priceAmount = 0;

  if (event.registrationType === "paid" && Number(event.price) > 0) {
    priceDisplay = `₹${event.price}`;
    priceAmount = Number(event.price);
  } else if (typeof event.price === "number" && event.price > 0 && event.registrationType !== "free") {
    priceDisplay = `₹${event.price}`;
    priceAmount = Number(event.price);
  } else {
    priceDisplay = "FREE";
    priceAmount = 0;
  }

  return {
    image,
    hasBanner,
    category,
    priceDisplay,
    priceAmount,
    tag
  };
}
