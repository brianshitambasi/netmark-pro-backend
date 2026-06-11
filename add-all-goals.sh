#!/bin/bash

# Get authentication token
echo "í´ Logging in..."
TOKEN=$(curl -s -X POST https://netmark-pro-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@netmarkpro.com","password":"Admin123"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "âŒ Login failed. Please check your credentials."
  exit 1
fi

echo "âœ… Login successful!"
echo ""

# Function to add a goal
add_goal() {
  local title=$1
  local type=$2
  local target=$3
  local period=$4
  
  echo "í³ Adding: $title"
  curl -s -X POST https://netmark-pro-backend.onrender.com/api/goals \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"title\": \"$title\",
      \"type\": \"$type\",
      \"target\": $target,
      \"period\": \"$period\",
      \"startDate\": \"2026-06-01\",
      \"endDate\": \"2026-06-30\"
    }" > /dev/null
}

echo "íº€ Adding 100 Goals to NetMark Pro..."
echo "================================================"
echo ""

# ============ RECRUITMENT GOALS (20) ============
echo "í³Š Adding RECRUITMENT GOALS..."
add_goal "Recruit 5 new team members this month" "recruitment" 5 "monthly"
add_goal "Recruit 10 new team members this month" "recruitment" 10 "monthly"
add_goal "Recruit 20 new team members this month" "recruitment" 20 "monthly"
add_goal "Recruit 50 new team members this quarter" "recruitment" 50 "quarterly"
add_goal "Recruit 100 new team members this year" "recruitment" 100 "quarterly"
add_goal "Recruit 3 new team members this week" "recruitment" 3 "weekly"
add_goal "Recruit 1 new team member today" "recruitment" 1 "weekly"
add_goal "Recruit 2 new team members by end of week" "recruitment" 2 "weekly"
add_goal "Build a downline of 50 active distributors" "recruitment" 50 "monthly"
add_goal "Build a downline of 100 active distributors" "recruitment" 100 "monthly"
add_goal "Help 5 team members recruit their first person" "recruitment" 5 "monthly"
add_goal "Help 10 team members rank up" "recruitment" 10 "monthly"
add_goal "Sponsor 3 new leaders this month" "recruitment" 3 "monthly"
add_goal "Sponsor 1 new leader this week" "recruitment" 1 "weekly"
add_goal "Convert 10 prospects to team members" "recruitment" 10 "monthly"
add_goal "Convert 20 prospects to team members" "recruitment" 20 "monthly"
add_goal "Have 5 team members reach first rank" "recruitment" 5 "monthly"
add_goal "Have 10 team members reach first rank" "recruitment" 10 "monthly"
add_goal "Recruit from 3 different cities" "recruitment" 3 "monthly"
add_goal "Recruit from 5 different countries" "recruitment" 5 "quarterly"

# ============ SALES GOALS (15) ============
echo "í²° Adding SALES GOALS..."
add_goal "Achieve KSh 50,000 in personal sales" "sales" 50000 "monthly"
add_goal "Achieve KSh 100,000 in personal sales" "sales" 100000 "monthly"
add_goal "Achieve KSh 250,000 in personal sales" "sales" 250000 "monthly"
add_goal "Achieve KSh 500,000 in personal sales" "sales" 500000 "monthly"
add_goal "Achieve KSh 1,000,000 in personal sales" "sales" 1000000 "quarterly"
add_goal "Sell 5 ENTRIVERSE packages" "sales" 5 "monthly"
add_goal "Sell 10 NEOVERSE packages" "sales" 10 "monthly"
add_goal "Sell 5 TECHNOVERSE packages" "sales" 5 "monthly"
add_goal "Sell 3 DIGIVERSE packages" "sales" 3 "monthly"
add_goal "Sell 2 MEGAVERSE packages" "sales" 2 "monthly"
add_goal "Sell KSh 200,000 worth of products" "sales" 200000 "monthly"
add_goal "Sell KSh 500,000 worth of products" "sales" 500000 "monthly"
add_goal "Close 5 sales this week" "sales" 5 "weekly"
add_goal "Close 10 sales this week" "sales" 10 "weekly"
add_goal "Close 20 sales this month" "sales" 20 "monthly"

# ============ COMMISSION GOALS (15) ============
echo "í²µ Adding COMMISSION GOALS..."
add_goal "Earn KSh 10,000 in commissions" "commission" 10000 "monthly"
add_goal "Earn KSh 25,000 in commissions" "commission" 25000 "monthly"
add_goal "Earn KSh 50,000 in commissions" "commission" 50000 "monthly"
add_goal "Earn KSh 100,000 in commissions" "commission" 100000 "monthly"
add_goal "Earn KSh 250,000 in commissions" "commission" 250000 "monthly"
add_goal "Earn KSh 500,000 in commissions" "commission" 500000 "quarterly"
add_goal "Earn KSh 1,000,000 in commissions" "commission" 1000000 "quarterly"
add_goal "Earn KSh 50,000 from team commissions" "commission" 50000 "monthly"
add_goal "Earn KSh 100,000 from team commissions" "commission" 100000 "monthly"
add_goal "Earn KSh 250,000 from team commissions" "commission" 250000 "quarterly"
add_goal "Earn KSh 500,000 from team commissions" "commission" 500000 "quarterly"
add_goal "Achieve monthly commission target of KSh 30,000" "commission" 30000 "monthly"
add_goal "Achieve monthly commission target of KSh 50,000" "commission" 50000 "monthly"
add_goal "Achieve monthly commission target of KSh 100,000" "commission" 100000 "monthly"
add_goal "Achieve monthly commission target of KSh 200,000" "commission" 200000 "monthly"

# ============ ACTIVITY GOALS (15) ============
echo "í³ž Adding ACTIVITY GOALS..."
add_goal "Make 50 follow-up calls this week" "activity" 50 "weekly"
add_goal "Make 100 follow-up calls this week" "activity" 100 "weekly"
add_goal "Make 200 follow-up calls this month" "activity" 200 "monthly"
add_goal "Send 50 WhatsApp messages to prospects" "activity" 50 "weekly"
add_goal "Send 100 WhatsApp messages to prospects" "activity" 100 "weekly"
add_goal "Send 200 WhatsApp messages to prospects" "activity" 200 "monthly"
add_goal "Attend 3 team training sessions" "activity" 3 "monthly"
add_goal "Attend 5 team training sessions" "activity" 5 "monthly"
add_goal "Attend 10 team training sessions" "activity" 10 "quarterly"
add_goal "Host 1 presentation this week" "activity" 1 "weekly"
add_goal "Host 3 presentations this week" "activity" 3 "weekly"
add_goal "Host 5 presentations this month" "activity" 5 "monthly"
add_goal "Get 20 people to attend your presentation" "activity" 20 "monthly"
add_goal "Get 50 people to attend your presentation" "activity" 50 "monthly"
add_goal "Follow up with 100% of new leads within 24 hours" "activity" 100 "weekly"

# ============ RANK ADVANCEMENT GOALS (10) ============
echo "í¿† Adding RANK ADVANCEMENT GOALS..."
add_goal "Achieve Bronze Rank" "recruitment" 5 "monthly"
add_goal "Achieve Silver Rank" "recruitment" 10 "monthly"
add_goal "Achieve Gold Rank" "recruitment" 25 "monthly"
add_goal "Achieve Platinum Rank" "recruitment" 50 "quarterly"
add_goal "Achieve Diamond Rank" "recruitment" 100 "quarterly"
add_goal "Achieve Double Diamond Rank" "recruitment" 200 "quarterly"
add_goal "Achieve Crown Rank" "recruitment" 300 "yearly"
add_goal "Achieve Double Crown Rank" "recruitment" 500 "yearly"
add_goal "Achieve Triple Crown Rank" "recruitment" 750 "yearly"
add_goal "Achieve Presidential Rank" "recruitment" 1000 "yearly"

# ============ TEAM BUILDING GOALS (10) ============
echo "í±¥ Adding TEAM BUILDING GOALS..."
add_goal "Build a team of 10 active distributors" "recruitment" 10 "monthly"
add_goal "Build a team of 25 active distributors" "recruitment" 25 "monthly"
add_goal "Build a team of 50 active distributors" "recruitment" 50 "quarterly"
add_goal "Build a team of 100 active distributors" "recruitment" 100 "quarterly"
add_goal "Build a team of 250 active distributors" "recruitment" 250 "yearly"
add_goal "Build a team of 500 active distributors" "recruitment" 500 "yearly"
add_goal "Have 5 team members achieve first rank" "recruitment" 5 "monthly"
add_goal "Have 10 team members achieve first rank" "recruitment" 10 "monthly"
add_goal "Have 3 team members achieve Silver Rank" "recruitment" 3 "quarterly"
add_goal "Have 5 team members achieve Gold Rank" "recruitment" 5 "quarterly"

# ============ WEEKLY GOALS (10) ============
echo "ï¿½ï¿½ Adding WEEKLY GOALS..."
add_goal "Add 10 new prospects this week" "activity" 10 "weekly"
add_goal "Add 20 new prospects this week" "activity" 20 "weekly"
add_goal "Add 50 new prospects this week" "activity" 50 "weekly"
add_goal "Close 3 sales this week" "sales" 3 "weekly"
add_goal "Close 5 sales this week" "sales" 5 "weekly"
add_goal "Close 10 sales this week" "sales" 10 "weekly"
add_goal "Recruit 2 new team members this week" "recruitment" 2 "weekly"
add_goal "Recruit 5 new team members this week" "recruitment" 5 "weekly"
add_goal "Make 30 follow-up calls this week" "activity" 30 "weekly"
add_goal "Send 50 WhatsApp messages this week" "activity" 50 "weekly"

# ============ MONTHLY GOALS (5) ============
echo "í³ˆ Adding MONTHLY GOALS..."
add_goal "Achieve KSh 100,000 monthly sales volume" "sales" 100000 "monthly"
add_goal "Achieve KSh 250,000 monthly sales volume" "sales" 250000 "monthly"
add_goal "Achieve KSh 500,000 monthly sales volume" "sales" 500000 "monthly"
add_goal "Grow team size by 20% this month" "recruitment" 20 "monthly"
add_goal "Achieve 50% growth in monthly commission" "commission" 50 "monthly"

echo ""
echo "================================================"
echo "âœ… All 100 goals have been added successfully!"
echo "================================================"
echo ""
echo "í³Š Summary:"
echo "   - Recruitment Goals: 20"
echo "   - Sales Goals: 15"
echo "   - Commission Goals: 15"
echo "   - Activity Goals: 15"
echo "   - Rank Advancement: 10"
echo "   - Team Building: 10"
echo "   - Weekly Goals: 10"
echo "   - Monthly Goals: 5"
echo ""
echo "í±‰ Refresh your frontend to see all goals in the Goals page!"
