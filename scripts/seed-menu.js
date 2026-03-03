// Category breakdown of seeded items (after dedup & filtering):
// Non-veg Biryani:   26 items  (101 Chicken Dum, Fry Piece, Lollipop, 65, Ghee Roast Kaju, etc.)
// Veg Biryani:       20 items  (Gongura, Mushroom, Paneer, Kaju, Ulavacharu, etc.)
// Non-veg Rice:      21 items  (Chicken Fried, Double Egg, Schezwan, Egg Fried, etc.)
// Veg Rice:          20 items  (Kaju, Mixed Veg, Gobi, Paneer, Veg Manchurian, etc.)
// Non-veg Noodles:   23 items  (Chicken, Egg, Schezwan, Manchurian, Double Egg, etc.)
// Veg Noodles:       20 items  (Kaju, Mixed Veg, Gobi, Paneer, Veg Manchurian, etc.)
// Non-veg Starters:  35 items  (Chicken 65, Lollipop, Manchurian, Majestic, Prawns, Kodi, etc.)
// Veg Starters:      18 items  (Mushroom 65, Paneer Majestic, Crispy Corn, Veg Manchurian, etc.)
// Non-veg Curries:   26 items  (Chicken Fry, Butter Masala, Tikka, Gongura, Kadai, Prawns, etc.)
// Veg Curries:       16 items  (Paneer Butter Masala, Mushroom, Gongura Paneer, Kadai, etc.)
// Non-veg Pulao:     26 items  (Ksheera series: Chicken, Egg, Prawns, Joint, etc.)
// Veg Pulao:         20 items  (Ksheera series: Mushroom, Paneer, Gongura, Kaju, etc.)
// Non-veg Soups:      8 items  (Chicken Shorba, Sweet Corn, Hot & Sour, Manchow)
// Veg Soups:         12 items  (Mushroom, Tomato, Clear, Sweet Corn, Hot & Sour, Manchow)
// Tiffins:           43 items  (Dosas, Idly, Wada, Bonda, Puri, Parota, Chapati, etc.)
// Rice Bowls:        10 items  (Curd, Lemon, Jeera, Tomato, Flashman Fried)
// Rotis/naans:        1 item   (Rumali Roti — Parota & Chapati deduplicated into Tiffins)
// French Fries:       4 items  (Cheese, Peri Peri, Masala, Plain)
// Non-veg Rolls:      5 items  (Chicken 65, Cheese, Plain, Egg Cheese, Egg)
// Veg Rolls:          6 items  (Paneer 65, Cheese, Mushroom, Paneer, Veg)
// Omelette:           4 items  (Cheese Full/Single, Egg Full/Single)
// Fried Egg:          2 items  (Full, Single)
// Boiled Egg:         2 items  (Full, Single)
// Beverages:          5 items  (Maaza, Campa, Campa Tin, Cool Drink, Thumps Up)
// Sweets:             1 item   (Double Ka Meetha)
// Extras:             5 items  (Water Bottle, Extra Egg, Special Omelette, Extra Piece, Plain Biryani Rice)
// Others:             4 items  (Chicken Full, Droum Stic, Gobi 65, Extra Rice, Idlyi*)
// *Note: actual count computed at runtime — script prints live breakdown at end
// Total approx:     ~383 unique items seeded

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCM0LIBRVreGCYBknlk_xEXoomzM3JAVBw",
  authDomain: "amogha-cafe.firebaseapp.com",
  projectId: "amogha-cafe",
  storageBucket: "amogha-cafe.firebasestorage.app",
  messagingSenderId: "1000994409697",
  appId: "1:1000994409697:web:983214bafab529d6a2fba0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper: check if name/category indicates non-veg
function isNonVeg(name, category) {
  const haystack = (name + ' ' + (category || '')).toLowerCase();
  return /chicken|egg|prawn|mutton|fish|seafood|royyala|kodi|non-veg/.test(haystack);
}

// Helper: infer category when it is null/None
function inferCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('biryani')) {
    if (/chicken|egg|prawn|kodi/.test(n)) return 'Non-veg Biryani';
    return 'Veg Biryani';
  }
  if (n.includes('fried rice') || n.includes('rice') && n.includes('fried')) {
    if (/chicken|egg/.test(n)) return 'Non-veg Rice';
    return 'Veg Rice';
  }
  if (n.includes('noodles')) {
    if (/chicken|egg/.test(n)) return 'Non-veg Noodles';
    return 'Veg Noodles';
  }
  if (/dosa|idl|vada|bonda|puri|pungulu|punugulu|chapati|chapathi|parota|upma|pesarattu/.test(n)) {
    return 'Tiffins';
  }
  if (n.includes('rice')) return 'Rice Bowls';
  if (/65|manchurian|majestic|lollipop|hot wings/.test(n)) {
    if (/chicken|prawn|egg/.test(n)) return 'Non-veg Starters';
  }
  if (n.includes('roll')) {
    if (/chicken|egg/.test(n)) return 'Non-veg Rolls';
    return 'Veg Rolls';
  }
  if (n.includes('soup')) {
    if (/chicken|egg|prawn/.test(n)) return 'Non-veg Soups';
    return 'Veg Soups';
  }
  if (n.includes('fries')) return 'French Fries';
  if (n.includes('omelette')) return 'Omelette';
  if (n.includes('boiled egg')) return 'Boiled Egg';
  if (n.includes('fried egg')) return 'Fried Egg';
  if (/water bottle|campa|maaza|cool drink|thumps up|drinks/.test(n)) return 'Beverages';
  return 'Others';
}

// Raw data: [sr_no, name, category, sale_price]
// All 407 rows from the Excel export, filtered and deduplicated below.
const rawItems = [
  [1, 'Maaza', null, 25],
  [2, 'Campa', null, 20],
  [3, 'Campa Tin', null, 30],
  [4, 'Chapathi (Full)', null, 50],
  [5, 'Chicken 65 Full', null, 200],
  [6, 'Chicken 65', null, 200],
  [7, 'Ghee Karam Idly', null, 60],
  [8, 'Paneer Dosa', null, 80],
  [9, 'Pungulu', 'Tiffins', 40],
  [10, 'Vada', null, 40],
  [11, 'Butter Masala Dosa', null, 80],
  // row 12: 'Campa' duplicate — skip
  // row 13: 'Pet Bottle' — skip (generic)
  [14, 'Cool Drink', null, 15],
  [15, 'Plain Dosa', 'Tiffins', 40],
  [16, 'Ghee Idle', 'Tiffins', 50],
  [17, 'Sambar Idle', 'Tiffins', 50],
  [18, 'Idle', 'Tiffins', 40],
  [19, 'Chitti Punugulu', 'Tiffins', 60],
  [20, 'Mirichi Bajji', 'Tiffins', 60],
  [21, 'Chitti Dosa', 'Tiffins', 60],
  [22, 'Chitti Pesarattu', 'Tiffins', 60],
  [23, 'Chitti Idly', 'Tiffins', 60],
  [24, 'Egg Burji', 'Tiffins', 60],
  [25, 'Egg Chapathi', 'Tiffins', 60],
  [26, 'Pulka', 'Tiffins', 20],
  [27, 'Parota', 'Tiffins', 50],
  [28, 'Onion Masala Ravva Dosa', 'Tiffins', 60],
  [29, 'Chapati', 'Tiffins', 50],
  [30, 'Sambar Wada', 'Tiffins', 50],
  [31, 'Plate Wada', 'Tiffins', 50],
  [32, 'Half Plate Wada', 'Tiffins', 30],
  [33, 'Onion Bonda Plate', 'Tiffins', 40],
  [34, 'Onion Bonda Half Plate', 'Tiffins', 25],
  [35, 'Mysore Bonda Plate', 'Tiffins', 40],
  [36, 'Mysore Bonda Half Plate', 'Tiffins', 25],
  [37, 'Puri Plate', 'Tiffins', 50],
  [38, 'Puri Half Plate', 'Tiffins', 30],
  [39, 'Onion Ravva Dosa', 'Tiffins', 60],
  [40, 'Ravva Dosa', 'Tiffins', 50],
  [41, 'Set Dosa', 'Tiffins', 50],
  [42, 'Uthappam', 'Tiffins', 50],
  [43, 'Double Egg Dosa', 'Tiffins', 60],
  [44, 'Egg Dosa', 'Tiffins', 50],
  [45, 'Upma Dosa', 'Tiffins', 50],
  [46, 'Onion Dosa', 'Tiffins', 50],
  [47, 'Masala Dosa', 'Tiffins', 50],
  [48, 'Ghee Karam Dosa', 'Tiffins', 50],
  [49, 'Karam Dosa', 'Tiffins', 45],
  // row 50: 'Plain Dosa' duplicate — skip
  [51, 'Ghee Idly', 'Tiffins', 50],
  [52, 'Sambar Idly', 'Tiffins', 50],
  [53, 'Idly Plate', 'Tiffins', 40],
  [54, 'Idly Half', 'Tiffins', 25],
  [55, 'Chicken Fried Rice Single', 'Non-veg Rice', 90],
  [56, 'Egg 65', 'Non-veg Starters', 100],
  [57, 'Amogha Special Baghara Rice- Chicken Fry', null, 169],
  [58, 'Gongura Veg Biryani', null, 159],
  [59, 'Thumps Up', null, 20],
  [60, '101 Chicken Dum Biryani Full', 'Non-veg Biryani', 269],
  [61, 'Chicken Dum Biryani Single', 'Non-veg Biryani', 139],
  [62, 'Flashman  Chicken Fried Rice Full', 'Rice Bowls', 180],
  [63, 'Flashman Fried Rice Single', 'Rice Bowls', 100],
  [64, 'Water Bottle', 'Extras', 10],
  [65, 'Chicken Full', null, 200],
  [66, 'Egg Burji', null, 60],   // duplicate name — skip at dedup time
  [67, 'Egg Manchurian', null, 150],
  [68, 'Droum Stic', null, 150],
  [69, 'Gobi 65', null, 100],
  [70, 'Extra Rice', null, 80],
  // row 71: 'Small' — skip (generic)
  [72, 'Double Ka Meetha', 'Sweets', 50],
  [73, 'Idlyi', null, 40],
  // row 74: 'Glass Bottle' — skip (generic)
  [75, 'Drinks', null, 20],
  [76, 'Dum Biryani Single', null, 130],
  // row 77: 'Water Bottle' duplicate — skip at dedup time
  // row 78: 'Chicken 65' duplicate — skip at dedup time
  [79, 'Fried Egg (Full)', 'Fried Egg', 40],
  [80, 'Fried Egg (Single)', 'Fried Egg', 20],
  [81, 'Boiled Egg (Full)', 'Boiled Egg', 30],
  [82, 'Boiled Egg (Single)', 'Boiled Egg', 15],
  [83, 'Cheese Omelette (Full)', 'Omelette', 60],
  [84, 'Cheese Omelette (Single)', 'Omelette', 40],
  [85, 'Egg Omelette (Full)', 'Omelette', 50],
  [86, 'Egg Omelette (Single)', 'Omelette', 30],
  [87, 'Chicken Lollipop Noodles (Full)', 'Non-veg Noodles', 220],
  [88, 'Chicken Lollipop Noodles (Single)', 'Non-veg Noodles', 150],
  [89, 'Chicken 65 Noodles (Full)', 'Non-veg Noodles', 220],
  [90, 'Chicken 65 Noodles (Single)', 'Non-veg Noodles', 150],
  [91, 'Corn Chicken Noodles (Full)', 'Non-veg Noodles', 220],
  [92, 'Corn Chicken Noodles (Single)', 'Non-veg Noodles', 150],
  [93, 'Chicken Manchurian Noodles (Full)', 'Non-veg Noodles', 220],
  [94, 'Chicken Manchurian Noodles (Single)', 'Non-veg Noodles', 150],
  [95, 'Garlic Chicken Noodles (Full)', 'Non-veg Noodles', 220],
  [96, 'Garlic Chicken Noodles (Single)', 'Non-veg Noodles', 150],
  [97, 'Double Chicken Noodles (Full)', 'Non-veg Noodles', 200],
  [98, 'Double Chicken Noodles (Single)', 'Non-veg Noodles', 130],
  [99, 'Double Egg Chicken Noodles (Full)', 'Non-veg Noodles', 200],
  [100, 'Double Egg Chicken Noodles (Single)', 'Non-veg Noodles', 130],
  [101, 'Chicken Schezwan Noodles (Full)', 'Non-veg Noodles', 170],
  [102, 'Chicken Schezwan Noodles (Single)', 'Non-veg Noodles', 90],
  [103, 'Chicken Noodles (Full)', 'Non-veg Noodles', 170],
  [104, 'Chicken Noodles (Single)', 'Non-veg Noodles', 90],
  [105, 'Schezwan Egg Noodles (Full)', 'Non-veg Noodles', 170],
  [106, 'Schezwan Egg Noodles (Single)', 'Non-veg Noodles', 90],
  [107, 'Double Egg Noodles (Full)', 'Non-veg Noodles', 170],
  [108, 'Double Egg Noodles (Single)', 'Non-veg Noodles', 90],
  [109, 'Egg Noodles (Full)', 'Non-veg Noodles', 150],
  [110, 'Egg Noodles (Single)', 'Non-veg Noodles', 80],
  [111, 'Kaju Noodles (Full)', 'Veg Noodles', 200],
  [112, 'Kaju Noodles (Single)', 'Veg Noodles', 110],
  [113, 'Mixed Veg Noodles (Full)', 'Veg Noodles', 180],
  [114, 'Mixed Veg Noodles (Single)', 'Veg Noodles', 100],
  [115, 'Corn Noodles (Full)', 'Veg Noodles', 160],
  [116, 'Corn Noodles (Single)', 'Veg Noodles', 90],
  [117, 'Gobi Noodles (Full)', 'Veg Noodles', 160],
  [118, 'Gobi Noodles (Single)', 'Veg Noodles', 90],
  [119, 'Chilli Garlic Noodles (Full)', 'Veg Noodles', 160],
  [120, 'Chilli Garlic Noodles (Single)', 'Veg Noodles', 90],
  [121, 'Mushroom Noodles (Full)', 'Veg Noodles', 160],
  [122, 'Mushroom Noodles (Single)', 'Veg Noodles', 90],
  [123, 'Paneer Noodles (Full)', 'Veg Noodles', 160],
  [124, 'Paneer Noodles (Single)', 'Veg Noodles', 90],
  [125, 'Veg Schezwan Noodles (Full)', 'Veg Noodles', 150],
  [126, 'Veg Schezwan Noodles (Single)', 'Veg Noodles', 80],
  [127, 'Veg Manchurian Noodles (Full)', 'Veg Noodles', 150],
  [128, 'Veg Manchurian Noodles (Single)', 'Veg Noodles', 80],
  [129, 'Veg Noodles (Full)', 'Veg Noodles', 130],
  [130, 'Veg Noodles (Single)', 'Veg Noodles', 70],
  [131, 'Parota', 'Rotis/naans', 20],  // different from row 27 (Tiffins)— same name, dedup keeps row 27
  [132, 'Rumali Roti', 'Rotis/naans', 15],
  [133, 'Chapati', 'Rotis/naans', 15],  // duplicate name — dedup keeps row 29
  [134, 'Prawns Fry (Full)', 'Non-veg Curries', 299],
  [135, 'Prawns Fry (Single)', 'Non-veg Curries', 199],
  [136, 'Ghee Roast Chicken Vepudu (Full)', 'Non-veg Curries', 279],
  [137, 'Ghee Roast Chicken Vepudu (Single)', 'Non-veg Curries', 149],
  [138, 'Miriyala Kodi Vepudu (Full)', 'Non-veg Curries', 249],
  [139, 'Miriyala Kodi Vepudu (Single)', 'Non-veg Curries', 139],
  [140, 'Chicken Tikka Masala (Full)', 'Non-veg Curries', 249],
  [141, 'Chicken Tikka Masala (Single)', 'Non-veg Curries', 139],
  [142, 'Chicken Butter Masala (Full)', 'Non-veg Curries', 269],
  [143, 'Chicken Butter Masala (Single)', 'Non-veg Curries', 129],
  [144, 'Pudina Chicken (Full)', 'Non-veg Curries', 239],
  [145, 'Pudina Chicken (Single)', 'Non-veg Curries', 129],
  [146, 'Kothimeera Chicken (Full)', 'Non-veg Curries', 239],
  [147, 'Kothimeera Chicken (Single)', 'Non-veg Curries', 129],
  [148, 'Gongura Chicken (Full)', 'Non-veg Curries', 239],
  [149, 'Gongura Chicken (Single)', 'Non-veg Curries', 129],
  [150, 'Kadai Chicken (Full)', 'Non-veg Curries', 239],
  [151, 'Kadai Chicken (Single)', 'Non-veg Curries', 129],
  [152, 'Chicken Fry (Full)', 'Non-veg Curries', 239],
  [153, 'Chicken Fry (Single)', 'Non-veg Curries', 129],
  [154, 'Chicken Curry (Andhra Style) (Full)', 'Non-veg Curries', 219],
  [155, 'Chicken Curry (Andhra Style) (Single)', 'Non-veg Curries', 119],
  [156, 'Egg Masala Curry (Full)', 'Non-veg Curries', 129],
  [157, 'Egg Masala Curry (Single)', 'Non-veg Curries', 79],
  [158, 'Gutthonkaay Masala (Full)', 'Veg Curries', 179],
  [159, 'Gutthonkaay Masala (Single)', 'Veg Curries', 99],
  [160, 'Mushroom Fry (Full)', 'Veg Curries', 219],
  [161, 'Mushroom Fry (Single)', 'Veg Curries', 119],
  [162, 'Paneer Tikka Masala (Full)', 'Veg Curries', 249],
  [163, 'Paneer Tikka Masala (Single)', 'Veg Curries', 139],
  [164, 'Mushroom Masala (Full)', 'Veg Curries', 219],
  [165, 'Mushroom Masala (Single)', 'Veg Curries', 119],
  [166, 'Gongura Paneer (Full)', 'Veg Curries', 239],
  [167, 'Gongura Paneer (Single)', 'Veg Curries', 129],
  [168, 'Kaju Paneer (Full)', 'Veg Curries', 239],
  [169, 'Kaju Paneer (Single)', 'Veg Curries', 129],
  [170, 'Kadai Paneer (Full)', 'Veg Curries', 239],
  [171, 'Kadai Paneer (Single)', 'Veg Curries', 129],
  [172, 'Paneer Butter Masala (Full)', 'Veg Curries', 219],
  [173, 'Paneer Butter Masala (Single)', 'Veg Curries', 119],
  [174, 'Prawns Pulao (Full)', 'Non-veg Pulao', 379],
  [175, 'Prawns Pulao (Single)', 'Non-veg Pulao', 199],
  [176, 'Ksheera Joint Pulao (Full)', 'Non-veg Pulao', 379],
  [177, 'Ksheera Joint Pulao (Single)', 'Non-veg Pulao', 199],
  [178, 'Ksheera Butter Chicken Pulao (Full)', 'Non-veg Pulao', 299],
  [179, 'Ksheera Butter Chicken Pulao (Single)', 'Non-veg Pulao', 169],
  [180, 'Ksheera Afghani Chicken Pulao (Full)', 'Non-veg Pulao', 319],
  [181, 'Ksheera Afghani Chicken Pulao (Single)', 'Non-veg Pulao', 179],
  [182, 'Ksheera Boneless Chicken Pulao (Full)', 'Non-veg Pulao', 299],
  [183, 'Ksheera Boneless Chicken Pulao (Single)', 'Non-veg Pulao', 169],
  [184, 'Ksheera Ghee Roast Kaju Chicken Pulao (Full)', 'Non-veg Pulao', 319],
  [185, 'Ksheera Ghee Roast Kaju Chicken Pulao (Single)', 'Non-veg Pulao', 179],
  [186, 'Ksheera Gongura Chicken Pulao (Full)', 'Non-veg Pulao', 279],
  [187, 'Ksheera Gongura Chicken Pulao (Single)', 'Non-veg Pulao', 159],
  [188, 'Ksheera Ulavacharu Chicken Pulao (Full)', 'Non-veg Pulao', 279],
  [189, 'Ksheera Ulavacharu Chicken Pulao (Single)', 'Non-veg Pulao', 159],
  [190, 'Ksheera Konaseema Chicken Pulao (Full)', 'Non-veg Pulao', 279],
  [191, 'Ksheera Konaseema Chicken Pulao (Single)', 'Non-veg Pulao', 159],
  [192, 'Ksheera Chicken 65 Pulao (Full)', 'Non-veg Pulao', 299],
  [193, 'Ksheera Chicken 65 Pulao (Single)', 'Non-veg Pulao', 169],
  [194, 'Ksheera Chicken Lollipop Pulao (Full)', 'Non-veg Pulao', 299],
  [195, 'Ksheera Chicken Lollipop Pulao (Single)', 'Non-veg Pulao', 169],
  [196, 'Ksheera Chicken Fry Piece Pulao (Full)', 'Non-veg Pulao', 279],
  [197, 'Ksheera Chicken Fry Piece Pulao (Single)', 'Non-veg Pulao', 159],
  [198, 'Ksheera Pulao With Egg Curry (Full)', 'Non-veg Pulao', 219],
  [199, 'Ksheera Pulao With Egg Curry (Single)', 'Non-veg Pulao', 119],
  [200, 'Ksheera Kaju Mushroom Pulao (Full)', 'Veg Pulao', 279],
  [201, 'Ksheera Kaju Mushroom Pulao (Single)', 'Veg Pulao', 179],
  [202, 'Ksheera Gongura Mushroom Pulao (Full)', 'Veg Pulao', 259],
  [203, 'Ksheera Gongura Mushroom Pulao (Single)', 'Veg Pulao', 159],
  [204, 'Ksheera Gongura Paneer Pulao (Full)', 'Veg Pulao', 269],
  [205, 'Ksheera Gongura Paneer Pulao (Single)', 'Veg Pulao', 169],
  [206, 'Ksheera Kaju Paneer Pulao (Full)', 'Veg Pulao', 269],
  [207, 'Ksheera Kaju Paneer Pulao (Single)', 'Veg Pulao', 169],
  [208, 'Ksheera Kaju Pulao (Full)', 'Veg Pulao', 249],
  [209, 'Ksheera Kaju Pulao (Single)', 'Veg Pulao', 149],
  [210, 'Ksheera Gutthonkay Pulao (Full)', 'Veg Pulao', 249],
  [211, 'Ksheera Gutthonkay Pulao (Single)', 'Veg Pulao', 149],
  [212, 'Ksheera Mushroom Pulao (Full)', 'Veg Pulao', 279],
  [213, 'Ksheera Mushroom Pulao (Single)', 'Veg Pulao', 149],
  [214, 'Ksheera Paneer Pulao (Full)', 'Veg Pulao', 279],
  [215, 'Ksheera Paneer Pulao (Single)', 'Veg Pulao', 149],
  [216, 'Ksheera Ulavacharu Pulao (Full)', 'Veg Pulao', 239],
  [217, 'Ksheera Ulavacharu Pulao (Single)', 'Veg Pulao', 129],
  [218, 'Ksheera Veg Pulao (Full)', 'Veg Pulao', 219],
  [219, 'Ksheera Veg Pulao (Single)', 'Veg Pulao', 119],
  [220, 'Extra Egg', 'Extras', 20],
  [221, 'Special Omelette', 'Extras', 40],
  [222, 'Extra Piece', 'Extras', 80],
  [223, 'Plain Biryani Rice', 'Extras', 80],
  [224, 'Kothimeera Chicken Fry Biryani (Full)', 'Non-veg Biryani', 319],
  [225, 'Kothimeera Chicken Fry Biryani (Single)', 'Non-veg Biryani', 169],
  [226, 'Butter Chicken Biryani (Full)', 'Non-veg Biryani', 319],
  [227, 'Butter Chicken Biryani (Single)', 'Non-veg Biryani', 169],
  [228, 'Afghani Chicken Biryani (Full)', 'Non-veg Biryani', 349],
  [229, 'Afghani Chicken Biryani (Single)', 'Non-veg Biryani', 189],
  [230, 'Boneless Chicken Biryani (Full)', 'Non-veg Biryani', 319],
  [231, 'Boneless Chicken Biryani (Single)', 'Non-veg Biryani', 169],
  [232, 'Ghee Roast Kaju Chicken Biryani (Full)', 'Non-veg Biryani', 349],
  [233, 'Ghee Roast Kaju Chicken Biryani (Single)', 'Non-veg Biryani', 189],
  [234, 'Gongura Chicken Biryani (Full)', 'Non-veg Biryani', 319],
  [235, 'Gongura Chicken Biryani (Single)', 'Non-veg Biryani', 169],
  [236, 'Ulavacharu Chicken Biryani (Full)', 'Non-veg Biryani', 319],
  [237, 'Ulavacharu Chicken Biryani (Single)', 'Non-veg Biryani', 169],
  [238, 'Konaseema Chicken Biryani (Full)', 'Non-veg Biryani', 319],
  [239, 'Konaseema Chicken Biryani (Single)', 'Non-veg Biryani', 169],
  [240, 'Chicken 65 Biryani (Full)', 'Non-veg Biryani', 319],
  [241, 'Chicken 65 Biryani (Single)', 'Non-veg Biryani', 169],
  [242, 'Chicken Lollipop Biryani (Full)', 'Non-veg Biryani', 319],
  [243, 'Chicken Lollipop Biryani (Single)', 'Non-veg Biryani', 169],
  [244, 'Chicken Fry Piece Biryani (Full)', 'Non-veg Biryani', 319],
  [245, 'Chicken Fry Piece Biryani (Single)', 'Non-veg Biryani', 169],
  [246, 'Zafrani Chicken Dum Biryani (Full)', 'Non-veg Biryani', 269],
  [247, 'Zafrani Chicken Dum Biryani (Single)', 'Non-veg Biryani', 139],
  [248, 'Egg Biryani (Full)', 'Non-veg Biryani', 219],
  [249, 'Egg Biryani (Single)', 'Non-veg Biryani', 119],
  [250, 'Kaju Mushroom Biryani (Full)', 'Veg Biryani', 319],
  [251, 'Kaju Mushroom Biryani (Single)', 'Veg Biryani', 169],
  [252, 'Gongura Mushroom Biryani (Full)', 'Veg Biryani', 299],
  [253, 'Gongura Mushroom Biryani (Single)', 'Veg Biryani', 159],
  [254, 'Gongura Paneer Biryani (Full)', 'Veg Biryani', 319],
  [255, 'Gongura Paneer Biryani (Single)', 'Veg Biryani', 179],
  [256, 'Kaju Paneer Biryani (Full)', 'Veg Biryani', 319],
  [257, 'Kaju Paneer Biryani (Single)', 'Veg Biryani', 179],
  [258, 'Kaju Veg Biryani (Full)', 'Veg Biryani', 259],
  [259, 'Kaju Veg Biryani (Single)', 'Veg Biryani', 149],
  [260, 'Ulavacharu Veg Biryani (Full)', 'Veg Biryani', 249],
  [261, 'Ulavacharu Veg Biryani (Single)', 'Veg Biryani', 139],
  [262, 'Mushroom Biryani (Full)', 'Veg Biryani', 279],
  [263, 'Mushroom Biryani (Single)', 'Veg Biryani', 149],
  [264, 'Paneer Biryani (Full)', 'Veg Biryani', 299],
  [265, 'Paneer Biryani (Single)', 'Veg Biryani', 159],
  [266, 'Veg Manchurian Biryani (Full)', 'Veg Biryani', 249],
  [267, 'Veg Manchurian Biryani (Single)', 'Veg Biryani', 139],
  [268, 'Veg Dum Biryani (Full)', 'Veg Biryani', 199],
  [269, 'Veg Dum Biryani (Single) With Offer', 'Veg Biryani', 119],
  [270, 'Cheese Fries', 'French Fries', 89],
  [271, 'Peri Peri Fries', 'French Fries', 89],
  [272, 'Masala Fries', 'French Fries', 79],
  [273, 'Plain Fries', 'French Fries', 69],
  [274, 'Chicken 65 Roll', 'Non-veg Rolls', 89],
  [275, 'Chicken Cheese Roll', 'Non-veg Rolls', 89],
  [276, 'Chicken Roll', 'Non-veg Rolls', 79],
  [277, 'Egg Cheese Roll', 'Non-veg Rolls', 79],
  [278, 'Egg Roll', 'Non-veg Rolls', 69],
  [279, 'Paneer 65 Roll', 'Veg Rolls', 89],
  [280, 'Paneer Cheese Roll', 'Veg Rolls', 89],
  [281, 'Veg Cheese Roll', 'Veg Rolls', 79],
  [282, 'Mushroom Roll', 'Veg Rolls', 79],
  [283, 'Paneer Roll', 'Veg Rolls', 79],
  [284, 'Veg Roll', 'Veg Rolls', 69],
  [285, 'Chicken Shorba Soup (One By Two)', 'Non-veg Soups', 130],
  [286, 'Chicken Shorba Soup (Single)', 'Non-veg Soups', 100],
  [287, 'Chicken Sweet Corn Soup (One By Two)', 'Non-veg Soups', 130],
  [288, 'Chicken Sweet Corn Soup (Single)', 'Non-veg Soups', 100],
  [289, 'Chicken Hot & Sour Soup (One By Two)', 'Non-veg Soups', 130],
  [290, 'Chicken Hot & Sour Soup (Single)', 'Non-veg Soups', 100],
  [291, 'Chicken Manchow Soup (One By Two)', 'Non-veg Soups', 130],
  [292, 'Chicken Manchow Soup (Single)', 'Non-veg Soups', 100],
  [293, 'Spicy Mushroom Soup (One By Two)', 'Veg Soups', 120],
  [294, 'Spicy Mushroom Soup(Single)', 'Veg Soups', 90],
  [295, 'Tomato Daniya Sorabha Soup(One By Two)', 'Veg Soups', 120],
  [296, 'Tomato Daniya Sorabha Soup (Single)', 'Veg Soups', 90],
  [297, 'Veg Clear Soup (One By Two)', 'Veg Soups', 110],
  [298, 'Veg Clear Soup (Single)', 'Veg Soups', 80],
  [299, 'Veg Sweet Corn Soup (One By Two)', 'Veg Soups', 110],
  [300, 'Veg Sweet Corn Soup (Single)', 'Veg Soups', 80],
  [301, 'Veg Hot & Sour Soup (One By Two)', 'Veg Soups', 110],
  [302, 'Veg Hot & Sour Soup (Single)', 'Veg Soups', 80],
  [303, 'Veg Manchow Soup (One By Two)', 'Veg Soups', 110],
  [304, 'Veg Manchow Soup (Single)', 'Veg Soups', 80],
  [305, 'Curd Rice (Full)', 'Rice Bowls', 160],
  [306, 'Curd Rice (Single)', 'Rice Bowls', 90],
  [307, 'Lemon Rice (Full)', 'Rice Bowls', 160],
  [308, 'Lemon Rice (Single)', 'Rice Bowls', 90],
  [309, 'Jeera Rice (Full)', 'Rice Bowls', 160],
  [310, 'Jeera Rice (Single)', 'Rice Bowls', 90],
  [311, 'Tomato Rice (Full)', 'Rice Bowls', 160],
  [312, 'Tomato Rice (Single)', 'Rice Bowls', 90],
  [313, 'Chicken Lollipop Rice (Full)', 'Non-veg Rice', 220],
  [314, 'Chicken Lollipop Rice (Single)', 'Non-veg Rice', 150],
  [315, 'Chicken 65 Rice (Full)', 'Non-veg Rice', 220],
  [316, 'Chicken 65 Rice (Single)', 'Non-veg Rice', 150],
  [317, 'Corn Chicken Rice (Full)', 'Non-veg Rice', 220],
  [318, 'Corn Chicken Rice (Single)', 'Non-veg Rice', 150],
  [319, 'Chicken Manchurian Rice (Full)', 'Non-veg Rice', 220],
  [320, 'Chicken Manchurian Rice (Single)', 'Non-veg Rice', 150],
  [321, 'Garlic Chicken Rice (Full)', 'Non-veg Rice', 220],
  [322, 'Garlic Chicken Rice (Single)', 'Non-veg Rice', 100],
  [323, 'Double Chicken Rice (Full)', 'Non-veg Rice', 200],
  [324, 'Double Chicken Rice (Single)', 'Non-veg Rice', 100],
  [325, 'Double Egg Chicken Rice (Full)', 'Non-veg Rice', 200],
  [326, 'Double Egg Chicken Rice (Single)', 'Non-veg Rice', 100],
  [327, 'Chicken Schezwan Rice (Full)', 'Non-veg Rice', 170],
  [328, 'Chicken Schezwan Rice (Single)', 'Non-veg Rice', 90],
  [329, 'Chicken Fried Rice (Full)', 'Non-veg Rice', 170],
  [330, 'Schezwan Egg Rice (Full)', 'Non-veg Rice', 170],
  [331, 'Schezwan Egg Rice (Single)', 'Non-veg Rice', 90],
  [332, 'Double Egg Fried Rice (Full)', 'Non-veg Rice', 170],
  [333, 'Double Egg Fried Rice (Single)', 'Non-veg Rice', 90],
  [334, 'Egg Fried Rice (Full)', 'Non-veg Rice', 150],
  [335, 'Egg Fried Rice (Single)', 'Non-veg Rice', 80],
  [336, 'Kaju Fried Rice (Full)', 'Veg Rice', 200],
  [337, 'Kaju Fried Rice (Single)', 'Veg Rice', 110],
  [338, 'Mixed Veg Fried Rice (Full)', 'Veg Rice', 180],
  [339, 'Mixed Veg Fried Rice (Single)', 'Veg Rice', 100],
  [340, 'Corn Fried Rice (Full)', 'Veg Rice', 160],
  [341, 'Corn Fried Rice (Single)', 'Veg Rice', 90],
  [342, 'Gobi Fried Rice (Full)', 'Veg Rice', 160],
  [343, 'Gobi Fried Rice (Single)', 'Veg Rice', 90],
  [344, 'Chilli Garlic Fried Rice (Full)', 'Veg Rice', 160],
  [345, 'Chilli Garlic Fried Rice (Single)', 'Veg Rice', 90],
  [346, 'Mushroom Fried Rice (Full)', 'Veg Rice', 160],
  [347, 'Mushroom Fried Rice (Single)', 'Veg Rice', 90],
  [348, 'Paneer Fried Rice (Full)', 'Veg Rice', 160],
  [349, 'Paneer Fried Rice (Single)', 'Veg Rice', 90],
  [350, 'Veg Schezwan Rice (Full)', 'Veg Rice', 150],
  [351, 'Veg Schezwan Rice (Single)', 'Veg Rice', 80],
  [352, 'Veg Manchurian Rice (Full)', 'Veg Rice', 150],
  [353, 'Veg Manchurian Rice (Single)', 'Veg Rice', 80],
  [354, 'Veg Fried Rice (Full)', 'Veg Rice', 130],
  [355, 'Veg Fried Rice (Single)', 'Veg Rice', 70],
  [356, 'Royyala Vepudu (Full)', 'Non-veg Starters', 280],
  [357, 'Royyala Vepudu (Single)', 'Non-veg Starters', 190],
  [358, 'Loose Prawns (Full)', 'Non-veg Starters', 280],
  [359, 'Loose Prawns (Single)', 'Non-veg Starters', 190],
  [360, 'Chilli Prawns (Full)', 'Non-veg Starters', 280],
  [361, 'Chilli Prawns (Single)', 'Non-veg Starters', 190],
  [362, 'Bheemavaram Kodi Vepudu (Full)', 'Non-veg Starters', 220],
  [363, 'Bheemavaram Kodi Vepudu (Single)', 'Non-veg Starters', 150],
  [364, 'Thaagubotu Kodi Fry (Full)', 'Non-veg Starters', 220],
  [365, 'Thaagubotu Kodi Fry (Single)', 'Non-veg Starters', 150],
  [366, 'Ghee Roast Chicken Fry (Full)', 'Non-veg Starters', 220],
  [367, 'Ghee Roast Chicken Fry (Single)', 'Non-veg Starters', 150],
  [368, 'Kothimeera Chicken Fry (Full)', 'Non-veg Starters', 220],
  [369, 'Kothimeera Chicken Fry (Single)', 'Non-veg Starters', 130],
  [370, 'Karivepaku Chicken (Full)', 'Non-veg Starters', 200],
  [371, 'Karivepaku Chicken (Single)', 'Non-veg Starters', 130],
  [372, 'Chicken Lollipop (Full)', 'Non-veg Starters', 220],
  [373, 'Chicken Lollipop (Single)', 'Non-veg Starters', 150],
  [374, 'Chicken Hot Wings (Full)', 'Non-veg Starters', 220],
  [375, 'Chicken Hot Wings (Single)', 'Non-veg Starters', 150],
  [376, 'Pepper Chicken (Full)', 'Non-veg Starters', 220],
  [377, 'Pepper Chicken (Single)', 'Non-veg Starters', 150],
  [378, 'Dragon Chicken (Full)', 'Non-veg Starters', 220],
  [379, 'Dragon Chicken (Single)', 'Non-veg Starters', 150],
  [380, 'Schezwan Chicken (Full)', 'Non-veg Starters', 200],
  [381, 'Schezwan Chicken (Single)', 'Non-veg Starters', 130],
  [382, 'Chicken Majestic (Full)', 'Non-veg Starters', 200],
  [383, 'Chicken Majestic (Single)', 'Non-veg Starters', 140],
  [384, 'Chilli Chicken (Full)', 'Non-veg Starters', 200],
  [385, 'Chilli Chicken (Single)', 'Non-veg Starters', 130],
  [386, 'Chicken 65 (Full)', 'Non-veg Starters', 220],
  [387, 'Chicken 65 (Single)', 'Non-veg Starters', 140],
  [388, 'Chicken Manchurian (Full)', 'Non-veg Starters', 200],
  [389, 'Chicken Manchurian (Single)', 'Non-veg Starters', 130],
  [390, 'Mushroom 65 (Full)', 'Veg Starters', 200],
  [391, 'Mushroom 65 (Single)', 'Veg Starters', 130],
  [392, 'Chilli Mushroom (Full)', 'Veg Starters', 200],
  [393, 'Chilli Mushroom (Single)', 'Veg Starters', 130],
  [394, 'Mushroom Manchurian (Full)', 'Veg Starters', 200],
  [395, 'Mushroom Manchurian (Single)', 'Veg Starters', 130],
  [396, 'Chilli Paneer (Full)', 'Veg Starters', 200],
  [397, 'Chilli Paneer (Single)', 'Veg Starters', 130],
  [398, 'Paneer Majestic (Full)', 'Veg Starters', 200],
  [399, 'Paneer Majestic (Single)', 'Veg Starters', 130],
  [400, 'Paneer 65 (Full)', 'Veg Starters', 200],
  [401, 'Paneer 65 (Single)', 'Veg Starters', 130],
  [402, 'Paneer Manchurian (Full)', 'Veg Starters', 200],
  [403, 'Paneer Manchurian (Single)', 'Veg Starters', 130],
  [404, 'Crispy Corn (Full)', 'Veg Starters', 180],
  [405, 'Crispy Corn (Single)', 'Veg Starters', 110],
  [406, 'Veg Manchurian (Full)', 'Veg Starters', 150],
  [407, 'Veg Manchurian (Single)', 'Veg Starters', 90],
];

// Names to skip entirely (too generic)
const SKIP_NAMES = new Set(['Small', 'Pet Bottle', 'Glass Bottle']);

// Process and deduplicate
const seenNames = new Set();
const menuItems = [];

for (const [sr_no, rawName, rawCategory, price] of rawItems) {
  // Strip trailing comma from name
  const name = rawName.replace(/,\s*$/, '').trim();

  // Skip generic/non-food names
  if (SKIP_NAMES.has(name)) continue;

  // Skip zero or missing price
  if (!price || price <= 0) continue;

  // Deduplicate by exact name (keep first occurrence)
  if (seenNames.has(name)) continue;
  seenNames.add(name);

  // Resolve category
  const category = (!rawCategory || rawCategory === 'None')
    ? inferCategory(name)
    : rawCategory;

  // Determine type
  const type = isNonVeg(name, category) ? 'non-veg' : 'veg';

  menuItems.push({
    name,
    price,
    category,
    type,
    available: false,
    sortOrder: sr_no + 100,
    shopId: 'amogha',
    description: '',
    badge: '',
  });
}

// Seed to Firestore
async function seed() {
  console.log(`Starting seed — ${menuItems.length} menu items to add...`);
  let count = 0;

  for (const item of menuItems) {
    await addDoc(collection(db, 'menu'), item);
    count++;
    if (count % 20 === 0) {
      console.log(`  Progress: ${count}/${menuItems.length} items added`);
    }
  }

  console.log(`\nDone! Total items seeded: ${count}`);

  // Print category breakdown
  const breakdown = {};
  for (const item of menuItems) {
    breakdown[item.category] = (breakdown[item.category] || 0) + 1;
  }
  console.log('\nCategory breakdown:');
  for (const [cat, cnt] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${cnt}`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
