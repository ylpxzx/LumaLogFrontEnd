import firstLight from '@/assets/badges/first_light.svg'
import weekStreak from '@/assets/badges/week_streak.svg'
import monthStreak from '@/assets/badges/month_streak.svg'
import hundredLights from '@/assets/badges/hundred_lights.svg'
import steadyFlow from '@/assets/badges/steady_flow.svg'
import firstHabitLight from '@/assets/badges/first_habit_light.svg'
import sevenDayRunner from '@/assets/badges/seven_day_runner.svg'
import thirtyDayRunner from '@/assets/badges/thirty_day_runner.svg'
import threeHabitsLit from '@/assets/badges/three_habits_lit.svg'
import hundredTotalLights from '@/assets/badges/hundred_total_lights.svg'

const badgeImages: Record<string, string> = {
  first_light: firstLight,
  week_streak: weekStreak,
  month_streak: monthStreak,
  hundred_lights: hundredLights,
  steady_flow: steadyFlow,
  first_habit_light: firstHabitLight,
  seven_day_runner: sevenDayRunner,
  thirty_day_runner: thirtyDayRunner,
  three_habits_lit: threeHabitsLit,
  hundred_total_lights: hundredTotalLights,
}

export function badgeImage(id: string) {
  return badgeImages[id] ?? firstLight
}
