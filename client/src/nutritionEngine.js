/**
 * Nutrition Intelligence Engine
 * Generates personalized meal plans and dietary guidance based on clinical data.
 * References: AHA dietary guidelines, DASH diet protocol, Mediterranean diet evidence, ADA nutrition therapy.
 */

const MEAL_DB = {
  // Breakfast options
  oatmeal_berries: { name: "Steel-cut oats with berries & walnuts", meal: "breakfast", calories: 320, tags: ["heart", "fiber", "antioxidant"], icon: "🥣", benefit: "Soluble fiber (beta-glucan) lowers LDL 5–10%. Berries provide anthocyanins that improve endothelial function." },
  egg_veggie_wrap: { name: "Egg white & vegetable wrap", meal: "breakfast", calories: 280, tags: ["protein", "low-sodium"], icon: "🌯", benefit: "High-quality protein without the saturated fat of whole eggs. Vegetables add potassium to counterbalance sodium." },
  smoothie_green: { name: "Green smoothie (spinach, banana, flaxseed)", meal: "breakfast", calories: 240, tags: ["heart", "potassium", "omega3"], icon: "🥤", benefit: "Spinach delivers nitrates that dilate blood vessels. Flaxseed provides ALA omega-3 for anti-inflammatory effect." },
  idli_sambar: { name: "Idli with sambar & coconut chutney", meal: "breakfast", calories: 300, tags: ["fermented", "low-fat", "traditional"], icon: "🍚", benefit: "Fermented food improves gut microbiome. Lentil-based sambar provides plant protein and iron." },
  poha: { name: "Flattened rice (poha) with peanuts & curry leaves", meal: "breakfast", calories: 280, tags: ["traditional", "iron", "light"], icon: "🍛", benefit: "Light yet nutritious. Peanuts add healthy fats. Curry leaves have anti-diabetic properties." },

  // Lunch options
  dal_rice_sabzi: { name: "Dal, brown rice & seasonal sabzi", meal: "lunch", calories: 420, tags: ["fiber", "protein", "traditional"], icon: "🍛", benefit: "Complete protein combination. Brown rice has 3.5x more fiber than white rice, lowering glycemic response." },
  grilled_fish_salad: { name: "Grilled fish with mixed greens", meal: "lunch", calories: 380, tags: ["omega3", "protein", "heart"], icon: "🐟", benefit: "Omega-3 fatty acids (EPA/DHA) reduce triglycerides 15–30%, lower resting heart rate, and reduce arrhythmia risk." },
  chickpea_bowl: { name: "Chickpea & quinoa power bowl", meal: "lunch", calories: 400, tags: ["fiber", "plant-protein", "heart"], icon: "🥗", benefit: "Chickpeas lower LDL by 5%. Quinoa provides complete plant protein. Combined glycemic index is low." },
  roti_paneer: { name: "Whole wheat roti with palak paneer", meal: "lunch", calories: 440, tags: ["calcium", "traditional", "protein"], icon: "🫓", benefit: "Spinach provides folate and iron. Paneer in moderation supplies calcium. Whole wheat roti adds fiber." },

  // Dinner options
  khichdi: { name: "Moong dal khichdi with ghee & vegetables", meal: "dinner", calories: 350, tags: ["easy-digest", "traditional", "healing"], icon: "🍲", benefit: "Easily digestible, gentle on metabolism. Moong dal is the lightest legume. Small amount of ghee aids nutrient absorption." },
  grilled_chicken_veg: { name: "Grilled chicken with roasted vegetables", meal: "dinner", calories: 380, tags: ["protein", "low-carb", "heart"], icon: "🍗", benefit: "Lean protein supports muscle maintenance. Roasted vegetables retain more nutrients than boiled." },
  lentil_soup: { name: "Red lentil soup with turmeric & ginger", meal: "dinner", calories: 290, tags: ["anti-inflammatory", "fiber", "healing"], icon: "🥣", benefit: "Turmeric (curcumin) is a powerful anti-inflammatory. Ginger improves circulation. Lentils deliver 18g fiber per cup." },
  veggie_stir_fry: { name: "Tofu & vegetable stir-fry with sesame", meal: "dinner", calories: 340, tags: ["plant-protein", "low-sodium", "heart"], icon: "🥘", benefit: "Soy protein lowers LDL 3–4%. Sesame seeds provide lignans that reduce oxidative stress." },

  // Snack options
  nuts_mix: { name: "Mixed nuts (almonds, walnuts, pistachios)", meal: "snack", calories: 180, tags: ["heart", "omega3", "satiety"], icon: "🥜", benefit: "30g/day of nuts reduces CVD risk by 30% (PREDIMED trial). Walnuts are especially rich in ALA omega-3." },
  fruit_yogurt: { name: "Greek yogurt with seasonal fruit", meal: "snack", calories: 150, tags: ["probiotic", "calcium", "low-sugar"], icon: "🥛", benefit: "Probiotics support the gut-heart axis. Calcium helps regulate blood pressure. Choose unsweetened." },
  hummus_veggies: { name: "Hummus with cucumber & carrot sticks", meal: "snack", calories: 160, tags: ["fiber", "plant-protein", "potassium"], icon: "🥕", benefit: "Chickpea-based hummus delivers fiber and plant protein. Raw vegetables add crunch without calories." },
  chana_chaat: { name: "Roasted chana with lemon & spices", meal: "snack", calories: 140, tags: ["protein", "fiber", "traditional"], icon: "🫘", benefit: "High fiber, low glycemic. The protein-fiber combination keeps blood sugar stable between meals." },
};

const CONDITION_FILTERS = {
  hypertension: { prioritize: ["potassium", "low-sodium", "heart"], avoid: ["high-sodium"], reason: "DASH diet pattern — proven to reduce systolic BP 8–14 mmHg" },
  diabetes: { prioritize: ["fiber", "low-sugar", "plant-protein"], avoid: ["high-glycemic"], reason: "Low glycemic load + consistent meal timing controls glucose spikes" },
  high_cholesterol: { prioritize: ["omega3", "fiber", "heart"], avoid: ["saturated-fat"], reason: "Soluble fiber + omega-3 combination targets both LDL and triglycerides" },
  obesity: { prioritize: ["satiety", "protein", "fiber"], avoid: ["calorie-dense"], reason: "High-protein, high-fiber meals maintain fullness while creating caloric deficit" },
  stress: { prioritize: ["anti-inflammatory", "omega3", "healing"], avoid: [], reason: "Anti-inflammatory foods reduce cortisol-driven cravings and inflammation" },
};

function detectConditions(payload, result) {
  const conditions = [];
  if ((payload?.systolic_bp || 0) >= 130) conditions.push("hypertension");
  if (payload?.diabetes === "yes" || (payload?.fasting_glucose || 0) >= 100) conditions.push("diabetes");
  if ((payload?.cholesterol || 0) >= 200 || (payload?.ldl_cholesterol || 0) >= 130) conditions.push("high_cholesterol");
  if (payload?.stress === "high") conditions.push("stress");
  return conditions;
}

function scoreMeal(meal, conditions) {
  let score = 0;
  for (const condition of conditions) {
    const filter = CONDITION_FILTERS[condition];
    if (!filter) continue;
    for (const tag of filter.prioritize) {
      if (meal.tags.includes(tag)) score += 2;
    }
    for (const tag of filter.avoid) {
      if (meal.tags.includes(tag)) score -= 3;
    }
  }
  return score;
}

function selectMealsForType(mealType, conditions, count = 2) {
  const meals = Object.values(MEAL_DB).filter(m => m.meal === mealType);
  const scored = meals.map(m => ({ ...m, score: scoreMeal(m, conditions) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

function generateDailyPlan(day, conditions) {
  return {
    day,
    meals: {
      breakfast: selectMealsForType("breakfast", conditions, 1)[0],
      lunch: selectMealsForType("lunch", conditions, 1)[0],
      dinner: selectMealsForType("dinner", conditions, 1)[0],
      snacks: selectMealsForType("snack", conditions, 2),
    },
  };
}

function generateGroceryList(weekPlan) {
  const items = new Set();
  const categories = { produce: [], protein: [], grains: [], dairy: [], pantry: [] };

  weekPlan.forEach(day => {
    const allMeals = [day.meals.breakfast, day.meals.lunch, day.meals.dinner, ...day.meals.snacks];
    allMeals.forEach(meal => {
      if (meal?.name) items.add(meal.name);
    });
  });

  // Generate smart grocery categories based on meal names
  categories.produce = ["Spinach / leafy greens", "Seasonal vegetables", "Bananas", "Berries", "Lemons", "Onions, tomatoes, ginger, garlic"];
  categories.protein = ["Moong dal / lentils", "Chickpeas (canned or dry)", "Eggs", "Greek yogurt (unsweetened)", "Fish (salmon or mackerel)"];
  categories.grains = ["Steel-cut oats", "Brown rice", "Whole wheat flour / roti", "Quinoa"];
  categories.pantry = ["Mixed nuts (almonds, walnuts)", "Flaxseeds", "Turmeric powder", "Olive oil / mustard oil", "Low-sodium spice blends"];
  categories.dairy = ["Paneer (in moderation)", "Low-fat milk or plant milk"];

  return categories;
}

function calculateDailyTargets(payload, result) {
  const risk = result?.risk_level || "Moderate";
  const age = Number(payload?.age || 40);
  const conditions = detectConditions(payload, result);

  let calorieTarget = 1800;
  if (age < 30) calorieTarget = 2000;
  if (age > 60) calorieTarget = 1600;
  if (payload?.activity_level === "high") calorieTarget += 200;
  if (payload?.activity_level === "low") calorieTarget -= 200;

  return {
    calories: calorieTarget,
    sodium: conditions.includes("hypertension") ? "< 1500 mg (DASH)" : "< 2300 mg (AHA)",
    fiber: "25–35g daily (AHA)",
    water: `${Math.round(age < 50 ? 2.5 : 2.0)} liters minimum`,
    sugar: "< 25g added sugar (AHA)",
    saturatedFat: "< 6% of calories (AHA)",
    omega3: "2 servings fatty fish/week (AHA)",
    potassium: conditions.includes("hypertension") ? "4700 mg/day (DASH target)" : "3500+ mg/day",
  };
}

function generateMealTimingAdvice(payload) {
  const advice = [];
  const hasDiabetes = payload?.diabetes === "yes" || (payload?.fasting_glucose || 0) >= 100;
  const hasStress = payload?.stress === "high";
  const hasPoorSleep = payload?.sleep_quality === "poor";

  advice.push({ time: "7:00–8:00 AM", action: "Breakfast within 1 hour of waking", reason: "Kickstarts metabolism and stabilizes morning cortisol" });

  if (hasDiabetes) {
    advice.push({ time: "10:30 AM", action: "Small protein-rich snack", reason: "Prevents mid-morning glucose dip and overeating at lunch" });
  }

  advice.push({ time: "12:30–1:30 PM", action: "Balanced lunch (largest meal)", reason: "Digestive enzymes peak midday — largest meal is processed most efficiently" });

  advice.push({ time: "4:00–4:30 PM", action: "Light snack (nuts or fruit)", reason: "Prevents evening hunger and cortisol-driven cravings" });

  advice.push({ time: "7:00–7:30 PM", action: "Light dinner (finish 3 hours before bed)", reason: hasPoorSleep
    ? "Late eating disrupts sleep architecture and overnight recovery"
    : "Early dinner gives the body time to complete digestion before sleep"
  });

  if (hasStress) {
    advice.push({ time: "Evening", action: "Herbal tea (chamomile or ashwagandha)", reason: "Natural cortisol reducer — signals the nervous system to downshift" });
  }

  return advice;
}

export function generateNutritionPlan(payload, result) {
  const conditions = detectConditions(payload, result);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Rotate meal selections for variety
  const weekPlan = days.map((day, i) => {
    const rotatedConditions = i % 2 === 0 ? conditions : [...conditions].reverse();
    return generateDailyPlan(day, rotatedConditions);
  });

  const groceryList = generateGroceryList(weekPlan);
  const dailyTargets = calculateDailyTargets(payload, result);
  const mealTiming = generateMealTimingAdvice(payload);

  const conditionAdvice = conditions.map(c => ({
    condition: c,
    ...(CONDITION_FILTERS[c] || {}),
  }));

  const hydrationTips = [
    "Start each morning with a glass of warm water + lemon — gentle liver support and hydration",
    "Drink water 30 min before meals, not during — aids digestion",
    "Monitor urine color: pale yellow = adequate hydration",
    (payload?.systolic_bp || 0) >= 130 ? "Adequate hydration helps kidneys excrete excess sodium — directly supports BP control" : "Hydration supports kidney function and toxin clearance",
  ];

  return {
    conditions,
    conditionAdvice,
    dailyTargets,
    mealTiming,
    weekPlan,
    groceryList,
    hydrationTips,
    todayPlan: weekPlan[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
  };
}
