export type DisasterType = 
  | 'flood' 
  | 'fire' 
  | 'earthquake' 
  | 'tsunami' 
  | 'volcano' 
  | 'landslide' 
  | 'whirlwind' 
  | 'general';

export interface Guide {
  id: string;
  title: string;
  description: string;
  disaster_type: DisasterType;
  content: string;
}

export const GUIDES: Guide[] = [
  // FLOOD CATEGORY
  {
    id: 'flood-safety',
    title: 'General Flood Safety',
    description: 'Essential steps to stay safe during flood events',
    disaster_type: 'flood',
    content: `## Before a Flood
- Know your area's flood risk and elevation
- Prepare an emergency kit with food, water, medications
- Create an evacuation plan with your family
- Keep important documents in waterproof containers
- Install check valves in sewer traps to prevent floodwater backups

## During a Flood
- Move to higher ground immediately if you see rising water
- Never walk or drive through flood waters ("Turn Around, Don't Drown")
- Stay away from power lines and electrical wires
- Listen to emergency broadcasts for updates
- If trapped in a building, move to the highest level (roof if necessary)

## After a Flood
- Return home only when authorities say it is safe
- Clean and disinfect everything that got wet
- Throw away food that has come into contact with flood water
- Watch out for hazards like weakened walls or contaminated water
- Avoid wading in standing water as it may be electrically charged or contaminated`
  },
  {
    id: 'potential-flood',
    title: 'Early Warning: Potential Flood',
    description: 'What to do when a flood watch or warning is issued',
    disaster_type: 'flood',
    content: `## Stay Informed
- Monitor local news and weather reports regularly
- Sign up for community alert systems
- Listen for emergency sirens or warning signals

## Prepare Your Home
- Bring in outdoor furniture and move essential items to upper floors
- disconnect electrical appliances if instructed
- Turn off gas, electricity, and water at the main switches if evacuation is likely
- Fill bathtubs and sinks with water for sanitary use in case contamination occurs

## Prepare for Evacuation
- Fuel your vehicle and prepare it for departure
- Pack your emergency go-bag
- Plan your evacuation route and destination
- Secure your pets`
  },
  {
    id: 'heavy-rain',
    title: 'Heavy Rain Safety',
    description: 'Staying safe during severe downpours',
    disaster_type: 'flood',
    content: `## On the Road
- Slow down and increase following distance
- Turn on headlights (low beams)
- Watch for large puddles that can cause hydroplaning
- Pull over if visibility is extremely poor
- Avoid underpasses and low-lying areas

## At Home
- Clear gutters and drains of debris
- Check basement sump pumps
- Watch for water accumulation near foundation
- Stay indoors and away from windows during severe storms`
  },
  {
    id: 'flash-flood',
    title: 'Flash Flood Survival',
    description: 'Immediate actions during rapid flooding',
    disaster_type: 'flood',
    content: `## Immediate Action
- Seek higher ground IMMEDIATELY - seconds count
- Do not wait for instructions to move
- Do not try to outrun a flash flood in your car
- If your vehicle stalls in water, abandon it immediately and seek higher ground
- Avoid camping or parking along streams, rivers, and creeks during heavy rain`
  },

  // FIRE CATEGORY
  {
    id: 'wildfire-safety',
    title: 'Wildfire Safety',
    description: 'Protecting yourself from spreading wildfires',
    disaster_type: 'fire',
    content: `## Preparedness
- Create a defensible space around your home (clear dry vegetation)
- Use fire-resistant materials for roofing and siding
- Have an evacuation plan and multiple routes (roads may be blocked)
- Keep an emergency kit ready (N95 masks are important for smoke)

## Evacuation
- Leave early if ordered to evacuate
- Wear protective clothing (long sleeves, pants, heavy shoes)
- Close all windows and doors to prevent drafts
- Turn off gas and pilot lights
- Open gates and unlocked doors to allow firefighter access`
  },
  {
    id: 'forest-fire',
    title: 'Forest Fire Prevention',
    description: 'Preventing and reacting to forest fires',
    disaster_type: 'fire',
    content: `## Prevention
- Never leave campfires unattended
- Drown campfires completely before leaving
- Dispose of cigarettes responsibly
- Avoid using equipment that throws sparks on dry days
- Respect fire bans and restrictions

## If You Spot a Fire
- Report it to 911 or local emergency numbers immediately
- Describe the location as accurately as possible
- Move away from the fire, preferably upwind`
  },
  {
    id: 'building-fire',
    title: 'Building Fire Escape',
    description: 'Escaping a structure fire safely',
    disaster_type: 'fire',
    content: `## During a Fire
- Alert everyone in the building and get out immediately
- Crawl low under smoke (smoke rises, air is cleaner near the floor)
- Feel doors with the back of your hand before opening - if hot, don't open
- Use stairs, NEVER elevators
- Close doors behind you to slow the spread of fire
- If clothes catch fire: STOP, DROP, and ROLL

## After Escaping
- Call emergency services immediately
- Never go back inside a burning building
- Meet at your designated meeting spot`
  },
  {
    id: 'gas-leak',
    title: 'Gas Leak Response',
    description: 'Handling suspected gas leaks',
    disaster_type: 'fire',
    content: `## Signs of a Gas Leak
- Smell of rotten eggs (sulfur)
- Hissing or whistling sounds near gas lines
- Dead vegetation near pipeline areas
- Bubbles in water puddles

## Immediate Actions
- Evacuate the area immediately
- Do NOT use light switches, phones, or electrical appliances (sparks can ignite gas)
- Do NOT start vehicles or light matches
- Call emergency services from a safe distance
- Do not return until declared safe`
  },

  // EARTHQUAKE CATEGORY
  {
    id: 'earthquake-safety',
    title: 'Earthquake Safety',
    description: 'Drop, Cover, and Hold On',
    disaster_type: 'earthquake',
    content: `## Before an Earthquake
- Secure heavy furniture to walls (bookshelves, cabinets)
- Identify safe spots in each room (under sturdy tables, against interior walls)
- Create an emergency kit
- Practice DROP, COVER, and HOLD ON drills

## During an Earthquake
- DROP to your hands and knees
- Take COVER under a sturdy desk or table
- HOLD ON until shaking stops
- If outdoors, move away from buildings, streetlights, and power lines
- If driving, pull over to a clear location and stop
- Do NOT stand in a doorway (modern doorways are not stronger)

## After an Earthquake
- Check yourself and others for injuries
- Inspect your home for structural damage
- Check for gas leaks
- Be prepared for aftershocks`
  },
  {
    id: 'aftershock',
    title: 'Dealing with Aftershocks',
    description: 'Safety during post-earthquake tremors',
    disaster_type: 'earthquake',
    content: `## What to Expect
- Aftershocks can occur minutes, days, or months after the main quake
- They can cause further damage to already weakened structures

## Safety Measures
- Stay away from damaged areas and buildings
- Be ready to Drop, Cover, and Hold On again
- Listen to battery-operated radios for updates
- Wear sturdy shoes to protect against debris`
  },

  // TSUNAMI CATEGORY
  {
    id: 'tsunami-safety',
    title: 'Tsunami Safety',
    description: 'Surviving tsunami waves',
    disaster_type: 'tsunami',
    content: `## Warning Signs
- Strong ground shaking (earthquake)
- Ocean water receding rapidly (drawback)
- Loud roar from the ocean
- Official warnings and sirens

## Immediate Action
- Move to high ground immediately (at least 100 feet above sea level or 1 mile inland)
- Do not wait for an official warning if you feel a strong earthquake near the coast
- Stay away from the beach
- Do not return until authorities imply it is safe (tsunamis are a series of waves, the first may not be the largest)`
  },

  // VOLCANO CATEGORY
  {
    id: 'volcano-eruption',
    title: 'Volcanic Eruption',
    description: 'Safety during volcanic activity',
    disaster_type: 'volcano',
    content: `## Before an Eruption
- Know your evacuation route
- Have shelter supplies (goggles, N95 masks for ash)

## During an Eruption
- Follow evacuation orders immediately
- Avoid areas downwind and river valleys downstream
- Protect yourself from falling ash (wear long sleeves, pants, goggles, mask)
- Close windows and doors, block vents to keep ash out
- Do not drive in heavy ash fall (it damages engines)

## Ashfall Safety
- Wear a mask outdoors
- Clear heavy ash from roofs (danger of collapse)
- Avoid using water to clean up ash (creates concrete-like sludge)`
  },

  // LANDSLIDE CATEGORY
  {
    id: 'landslide-safety',
    title: 'Landslide Awareness',
    description: 'Preparing for and surviving landslides',
    disaster_type: 'landslide',
    content: `## Warning Signs
- Changes in landscape patterns
- Leaning trees, poles, or fences
- New cracks in foundations or paved areas
- Rumbling sounds that increase in volume

## During a Landslide
- Move away from the path of the landslide immediately
- Getting out of the path of a debris flow is your best protection
- If escape is impossible, curl into a tight ball and protect your head
- Stay alert for additional slides`
  },
  {
    id: 'mudflow',
    title: 'Mudflow Safety',
    description: 'Dangers of fluid debris flows',
    disaster_type: 'landslide',
    content: `## Risks
- Mudflows can move faster than you can walk or run
- Often occur after wildfires or heavy rains

## Safety Actions
- Stay awake during severe storms if you are in a risk area
- Monitor water levels in streams (sudden drop may indicate upstream blockage/damming)
- Listen for unusual sounds like trees cracking or boulders knocking together`
  },

  // WHIRLWIND / CYCLONE CATEGORY
  {
    id: 'cyclone-safety',
    title: 'Cyclone & Hurricane Safety',
    description: 'Preparing for major wind storms',
    disaster_type: 'whirlwind',
    content: `## Preparation
- Reinforce roof, windows, and doors (storm shutters)
- Trim trees and shrubs
- Bring loose outdoor items inside
- Stock up on supplies (3-day minimum) (Water, Food, Batteries)

## During the Storm
- Stay indoors away from windows and glass doors
- Close all interior doors
- Take refuge in a small interior room, closet, or hallway on the lowest level
- Lie on the floor under a sturdy object if wind becomes severe`
  },
  {
    id: 'tornado-safety',
    title: 'Tornado Safety',
    description: 'Immediate response to tornado warnings',
    disaster_type: 'whirlwind',
    content: `## Signs of a Tornado
- Dark, often greenish sky
- Large hail
- A large, dark, low-lying cloud (particularly if rotating)
- Loud roar, similar to a freight train

## Immediate Action
- Go to the basement or an inside room without windows on the lowest floor (bathroom, closet, center hallway)
- Avoid windows
- For added protection get under something sturdy (a heavy table or workbench)
- Cover your body with a blanket, sleeping bag or mattress
- IF OUTDOORS: Seek shelter in a sturdy building. If none is available, lie flat in a ditch or low spot and cover your head with your hands. Do NOT get under an overpass.`
  },

  // GENERAL
  {
    id: 'emergency-kit',
    title: 'Emergency Kit Checklist',
    description: 'Essential items for any disaster',
    disaster_type: 'general',
    content: `## Basic Disaster Supplies Kit
- Water (one gallon per person per day for at least 3 days)
- Food (at least a 3-day supply of non-perishable food)
- Battery-powered or hand crank radio and a NOAA Weather Radio
- Flashlight
- First aid kit
- Extra batteries
- Whistle (to signal for help)
- Dust mask (to help filter contaminated air)
- Plastic sheeting and duct tape (to shelter in place)
- Moist towelettes, garbage bags and plastic ties (for personal sanitation)
- Wrench or pliers (to turn off utilities)
- Manual can opener (for food)
- Local maps
- Cell phone with chargers and a backup battery`
  }
];

export const getIconNameByType = (type: string) => {
  switch (type) {
      case 'flood': return 'flood';
      case 'earthquake': return 'tsunami'; // closest match usually
      case 'fire': return 'local_fire_department';
      case 'landslide': return 'landslide';
      case 'tsunami': return 'waves';
      case 'volcano': return 'volcano';
      case 'whirlwind': return 'cyclone';
      case 'general': return 'medical_services';
      default: return 'menu_book';
  }
};

export const getColorByType = (type: string) => {
  switch (type) {
      case 'flood': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'earthquake': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'fire': return 'bg-red-50 text-red-600 border-red-100';
      case 'landslide': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'tsunami': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
        case 'volcano': return 'bg-rose-50 text-rose-600 border-rose-100';
        case 'whirlwind': return 'bg-slate-50 text-slate-600 border-slate-100';
        case 'general': return 'bg-teal-50 text-teal-600 border-teal-100';
        default: return 'bg-gray-50 text-gray-600 border-gray-100';
  }
};

export const getHeaderColorByType = (type: string) => {
    switch (type) {
        case 'flood': return 'bg-blue-600';
        case 'earthquake': return 'bg-amber-600';
        case 'fire': return 'bg-red-600';
        case 'landslide': return 'bg-orange-600';
        case 'tsunami': return 'bg-cyan-600';
        case 'volcano': return 'bg-rose-600';
        case 'whirlwind': return 'bg-slate-600';
        case 'general': return 'bg-slate-600';
        default: return 'bg-slate-600';
    }
};
