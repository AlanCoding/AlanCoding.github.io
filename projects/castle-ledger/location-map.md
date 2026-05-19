# Castle Ledger Location Map

```mermaid
flowchart TB
  subgraph Outer_Ring["Outer Ring"]
    south_road["Southern Road to Beldane Keep"]
    south_market_lane["Market Lane Beside the South Wall"]
    front_drawbridge["Front Drawbridge Plaza"]
    southeast_shanty["Shanties of the Ropewalkers"]
    east_mill_stream["Mill Stream Curve"]
    east_postern["Eastern Postern Bridge"]
    northeast_monastery["Monastery Gardens by the Priory"]
    north_reed_marsh["Northern Reed Marsh"]
    rear_drawbridge["Rear Service Drawbridge"]
    northwest_hunters["Hunters' Stands and Archery Butts"]
    west_floodgate["West Floodgate"]
    west_sally_port["West Sally Port Tower"]
    pilgrim_shrine["Hawthorn Shrine of Saint Guthlac"]
    butchers_stall["Gervais the Butcher's Stall"]
    village_green["Village Green Beside the Gate"]
    ropemaker_shack["Matilde the Ropemaker's Shack"]
    mill_jetty["Mill Jetty and Sluice"]
    scriptorium["Priory Scriptorium"]
    fishers_huts["Fishers' Marsh Huts"]
    surgeons_pavilion["Leech's Pavilion"]
    tanners_yard["Tanners' Drying Yard"]
  end

  subgraph Inner_Ward["Inside Beldane Keep"]
    outer_bailey["Outer Bailey of Beldane Keep"]
    stables["Castle Stables and Pigeon Loft"]
    messenger_loft["Messenger Loft"]
    blacksmith_forge["Blacksmith's Forge"]
    training_yard_gate["Training Yard Gate"]
    training_yard["Training Yard"]
    guard_station["Guard Station and Message Room"]
    great_hall_entry["Great Hall Stair"]
    kitchens["Castle Kitchens"]
    great_hall["Great Hall of Beldane"]
    solar["Steward's Solar"]
    wall_walk["Wall Walk Overlooking the Fields"]
    chapel["Castle Chapel"]
    archives["Castle Archives"]
  end

  south_road <--> south_market_lane
  south_market_lane <--> front_drawbridge
  front_drawbridge <--> southeast_shanty
  southeast_shanty <--> east_mill_stream
  east_mill_stream <--> east_postern
  east_postern <--> northeast_monastery
  northeast_monastery <--> north_reed_marsh
  north_reed_marsh <--> rear_drawbridge
  rear_drawbridge <--> northwest_hunters
  northwest_hunters <--> west_floodgate
  west_floodgate <--> west_sally_port
  west_sally_port <--> south_road

  south_road <--> pilgrim_shrine
  south_market_lane <--> butchers_stall
  front_drawbridge <--> village_green
  southeast_shanty <--> ropemaker_shack
  east_mill_stream <--> mill_jetty
  northeast_monastery <--> scriptorium
  north_reed_marsh <--> fishers_huts
  northwest_hunters <--> surgeons_pavilion
  west_floodgate <--> tanners_yard

  outer_bailey <--> stables
  stables <--> messenger_loft
  outer_bailey <--> blacksmith_forge
  outer_bailey <--> training_yard_gate
  training_yard_gate -. "after bandaging the guard" .-> training_yard
  outer_bailey <--> guard_station
  outer_bailey <--> great_hall_entry
  great_hall_entry <--> kitchens
  great_hall_entry <--> great_hall
  great_hall <--> solar
  outer_bailey <--> wall_walk
  great_hall_entry <--> chapel
  great_hall_entry <--> archives

  east_postern -. "rope secured + mastiff distracted" .-> outer_bailey
  west_sally_port -. "only after you have entered the castle" .-> outer_bailey
  front_drawbridge -. "warden allows entry once you are recognized" .-> outer_bailey
  outer_bailey --> east_postern
```

Notes:

- Solid arrows are ordinary travel links.
- Dashed arrows are conditional access points.
- The main outdoor loop is the 12-node ring at the top.
- The most important breakthrough is usually `east_postern -> outer_bailey`.
