import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronDown,
  X, 
  Heart, 
  Moon, 
  Activity as ActivityIcon, 
  Sparkles, 
  Clock, 
  Check, 
  Compass, 
  Info, 
  Calendar as CalendarIcon,
  HelpCircle,
  TrendingUp,
  BarChart2,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

// ============================================================
// 1. DATA MODELS & CONSTANTS
// ============================================================

// Monthly Activity Days Trend (June – November 2026)
interface MonthActiveRecord {
  month: string;
  fullMonth: string;
  days: number;
  isCurrent?: boolean;
}

const MONTHLY_ACTIVE_TREND: MonthActiveRecord[] = [
  { month: 'Jun', fullMonth: 'June 2026', days: 14 },
  { month: 'Jul', fullMonth: 'July 2026', days: 16 },
  { month: 'Aug', fullMonth: 'August 2026', days: 15 },
  { month: 'Sep', fullMonth: 'September 2026', days: 19 },
  { month: 'Oct', fullMonth: 'October 2026', days: 21 },
  { month: 'Nov', fullMonth: 'November 2026', days: 18, isCurrent: true },
];

// Recent Rhythm Datasets (7 Days vs Month)
interface RhythmRecentDataSet {
  timeframe: '7d' | 'month';
  rangeLabel: string;
  completedCount: number;
  activeMinutes: number;
  restDaysCount: number;
  rescheduledCount: number;
  novaObservation: string;
  bars: Array<{
    label: string;
    minutes: number;
    sublabel: string;
    isRest?: boolean;
  }>;
}

const RHYTHM_RECENT_DATA: Record<'7d' | 'month', RhythmRecentDataSet> = {
  '7d': {
    timeframe: '7d',
    rangeLabel: 'Past 7 days',
    completedCount: 5,
    activeMinutes: 75,
    restDaysCount: 2,
    rescheduledCount: 1,
    novaObservation: 'You follow through most comfortably around 1:15 PM with short, unhurried resets.',
    bars: [
      { label: 'Mon', minutes: 15, sublabel: '15m' },
      { label: 'Tue', minutes: 20, sublabel: '20m' },
      { label: 'Wed', minutes: 0, sublabel: 'Rest', isRest: true },
      { label: 'Thu', minutes: 15, sublabel: '15m' },
      { label: 'Fri', minutes: 5, sublabel: '5m' },
      { label: 'Sat', minutes: 20, sublabel: '20m' },
      { label: 'Sun', minutes: 0, sublabel: 'Rest', isRest: true },
    ],
  },
  'month': {
    timeframe: 'month',
    rangeLabel: 'November (Month)',
    completedCount: 18,
    activeMinutes: 245,
    restDaysCount: 4,
    rescheduledCount: 3,
    novaObservation: 'Mid-week sessions naturally shift toward 5-minute stretches, sustaining continuity without fatigue.',
    bars: [
      { label: 'W1', minutes: 65, sublabel: '65m' },
      { label: 'W2', minutes: 55, sublabel: '55m' },
      { label: 'W3', minutes: 70, sublabel: '70m' },
      { label: 'W4', minutes: 55, sublabel: '55m' },
    ],
  },
};

// ============================================================
// Activity Monthly Records Data Model (Device Local Date Driven)
// ============================================================
export function getDeviceLocalDate(): { year: number; month: number; day: number; dateStr: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0 = January, 11 = December
  const day = now.getDate();
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, dateStr };
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export type ActivityRecordType = 'active' | 'rest' | 'none';

export interface DayActivityRecord {
  date: string; // 'YYYY-MM-DD'
  type: ActivityRecordType;
  title: string;
  durationMinutes: number;
  category?: 'walk' | 'stretch' | 'mobility' | 'rest';
  note?: string;
  isSample?: boolean;
  updatedAt?: string;
}

export function generateInitialActivityLogs(): Record<string, DayActivityRecord> {
  const logs: Record<string, DayActivityRecord> = {};
  const now = new Date();

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Seed Today with an initial completed session
  const todayStr = formatYMD(now);
  logs[todayStr] = {
    date: todayStr,
    type: 'active',
    title: '15-min mindful walk (Today)',
    durationMinutes: 15,
    category: 'walk',
    note: 'Completed today at 1:15 PM pacing window',
    isSample: true,
  };

  // Seed recent 90 days backwards dynamically from user's current device date
  for (let i = 1; i <= 90; i++) {
    const pastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = formatYMD(pastDate);
    const dayOfWeek = pastDate.getDay();

    if (i === 1) {
      logs[dateStr] = {
        date: dateStr,
        type: 'active',
        title: '15-min mindful walk',
        durationMinutes: 15,
        category: 'walk',
        note: 'Unhurried neighborhood walk at 1:15 PM',
        isSample: true,
      };
    } else if (i === 2) {
      logs[dateStr] = {
        date: dateStr,
        type: 'active',
        title: '5-min gentle stretch',
        durationMinutes: 5,
        category: 'stretch',
        note: 'Afternoon desk shoulder & neck release',
        isSample: true,
      };
    } else if (i === 3) {
      logs[dateStr] = {
        date: dateStr,
        type: 'rest',
        title: 'Mindful rest day',
        durationMinutes: 0,
        category: 'rest',
        note: 'Autonomic recovery & restorative breathing',
        isSample: true,
      };
    } else {
      if (dayOfWeek === 0 || i % 7 === 0) {
        logs[dateStr] = {
          date: dateStr,
          type: 'rest',
          title: 'Mindful rest day',
          durationMinutes: 0,
          category: 'rest',
          note: 'Intentional recovery buffer',
          isSample: true,
        };
      } else if (i % 5 === 0) {
        // Leave unlogged occasionally
      } else {
        const isStretch = i % 3 === 0;
        logs[dateStr] = {
          date: dateStr,
          type: 'active',
          title: isStretch ? '5-min gentle stretch' : '15-min mindful walk',
          durationMinutes: isStretch ? 5 : 15,
          category: isStretch ? 'stretch' : 'walk',
          note: 'Consistent mid-day movement session',
          isSample: true,
        };
      }
    }
  }

  return logs;
}

// ------------------------------------------------------------
// Direction Preset Goals & State Definition
// ------------------------------------------------------------
export interface DirectionState {
  goalId: string;
  goalTitle: string;
  description: string;
  executionApproach: string;
  status: 'active' | 'paused';
  nextReviewDate: string;
  reviewDaysLeft: number;
  tailoredReason: string;
}

export const PRESET_DIRECTION_GOALS = [
  {
    id: 'nervous_system',
    title: 'Nervous System Recovery',
    description: 'Prioritizing low-demand physical resets over high-intensity strain during heavy workload weeks.',
    defaultApproach: '5-min gentle living room stretches & 15-min mindful walks around 1:15 PM',
    tailoredReason: 'Calibrated to your natural 1:15 PM follow-through window and mid-week energy dips to avoid burnout.'
  },
  {
    id: 'movement_continuity',
    title: 'Daily Movement Continuity',
    description: 'Preserving the daily rhythm with easy 5-minute Plan B options rather than dropping to zero.',
    defaultApproach: 'Daily micro-movements: 5–10 min unhurried pace near your living room or desk',
    tailoredReason: 'Builds psychological safety by ensuring busy days still count as successful days.'
  },
  {
    id: 'tension_relief',
    title: 'Stress & Tension Relief',
    description: 'Releasing physical stiffness in shoulders, neck, and lower back caused by sedentary desk hours.',
    defaultApproach: 'Targeted mobility flows at 11:30 AM and 4:30 PM with unhurried deep breathing',
    tailoredReason: 'Intervenes directly before posture fatigue compounds into physical tension.'
  },
  {
    id: 'sleep_buffer',
    title: 'Sleep Quality Buffer',
    description: 'Creating a calm psychological buffer before bed with low-sensory evening movement.',
    defaultApproach: '10-minute quiet evening wind-down walk or gentle floor stretch before 9:30 PM',
    tailoredReason: 'Helps lower sympathetic nervous arousal to support deeper, consistent rest.'
  }
];

const DEFAULT_DIRECTION: DirectionState = {
  goalId: 'nervous_system',
  goalTitle: 'Nervous System Recovery',
  description: 'Prioritizing low-demand physical resets over high-intensity strain during heavy workload weeks.',
  executionApproach: '5-min gentle living room stretches & 15-min mindful walks around 1:15 PM',
  status: 'active',
  nextReviewDate: 'Nov 30, 2026',
  reviewDaysLeft: 27,
  tailoredReason: 'Calibrated to your natural 1:15 PM follow-through window and mid-week energy dips to avoid burnout.'
};

// ------------------------------------------------------------
// Health Data Model
// ------------------------------------------------------------
interface HealthMetricItem {
  id: string;
  name: string;
  sampleValue: string;
  unit: string;
  trend: string;
  status: string;
  source: string;
  lastUpdated: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}

const HEALTH_METRICS_DEFINITIONS: HealthMetricItem[] = [
  {
    id: 'rhr',
    name: 'Resting Heart Rate',
    sampleValue: '62',
    unit: 'bpm',
    trend: '↓ 2 bpm vs baseline',
    status: 'Steady & calm',
    source: 'Apple Watch Series 9 (Sample)',
    lastUpdated: 'Today, 8:45 AM',
    icon: Heart,
    iconColor: 'text-[#D96B78]',
    iconBg: 'bg-[#FDF0ED]'
  },
  {
    id: 'sleep',
    name: 'Sleep Duration',
    sampleValue: '7h 24m',
    unit: 'avg',
    trend: '86% consistency',
    status: 'Regular circadian baseline',
    source: 'Apple Watch Sleep (Sample)',
    lastUpdated: 'Today, 7:15 AM',
    icon: Moon,
    iconColor: 'text-[#6366F1]',
    iconBg: 'bg-[#EEF2FF]'
  },
  {
    id: 'hrv',
    name: 'Heart Rate Variability',
    sampleValue: '48',
    unit: 'ms',
    trend: 'Balanced recovery zone',
    status: 'Good autonomic equilibrium',
    source: 'Apple Watch SDNN (Sample)',
    lastUpdated: 'Today, 8:45 AM',
    icon: ActivityIcon,
    iconColor: 'text-[#5E5BAE]',
    iconBg: 'bg-[#F3EEFE]'
  },
  {
    id: 'mindful',
    name: 'Mindful Minutes',
    sampleValue: '85',
    unit: 'min',
    trend: '+15 min vs target',
    status: 'Recorded via Plan B sessions',
    source: 'Plan B Audio Sync (Sample)',
    lastUpdated: 'Yesterday, 1:30 PM',
    icon: Sparkles,
    iconColor: 'text-[#D9822B]',
    iconBg: 'bg-[#FEF5EB]'
  }
];

// Helper to compute smooth SVG cubic bezier path
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = p1.x - p0.x;
    const cp1x = p0.x + dx * 0.45;
    const cp1y = p0.y;
    const cp2x = p1.x - dx * 0.45;
    const cp2y = p1.y;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

// Reusable Long-term Trend Curve Component
function MonthlyTrendCurve({ compact = false }: { compact?: boolean }) {
  const width = 310;
  const height = compact ? 70 : 86;
  const leftPad = 26;
  const rightPad = 26;
  const topPad = compact ? 16 : 20;
  const baselineY = compact ? 48 : 58;
  const textY = compact ? 62 : 76;

  const stepX = (width - leftPad - rightPad) / (MONTHLY_ACTIVE_TREND.length - 1);
  const minDays = 10;
  const maxDays = 24;
  const rangeY = maxDays - minDays;
  const usableH = baselineY - topPad;

  const points = MONTHLY_ACTIVE_TREND.map((item, idx) => {
    const x = leftPad + idx * stepX;
    const y = baselineY - ((item.days - minDays) / rangeY) * usableH;
    return { ...item, x, y };
  });

  const curvePath = buildSmoothPath(points);
  const areaPath = `${curvePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

  return (
    <div className="w-full select-none">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto overflow-visible" 
        preserveAspectRatio="xMidYMid meet"
        aria-label="Monthly active days trend line chart"
      >
        <defs>
          <linearGradient id="rhythmCurveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5E5BAE" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#5E5BAE" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <line 
          x1={leftPad} 
          y1={baselineY} 
          x2={width - rightPad} 
          y2={baselineY} 
          stroke="#26263F" 
          strokeOpacity="0.08" 
          strokeDasharray="3 3" 
        />

        <path d={areaPath} fill="url(#rhythmCurveGradient)" />

        <path 
          d={curvePath} 
          fill="none" 
          stroke="#5E5BAE" 
          strokeWidth="2.4" 
          strokeLinecap="round" 
        />

        {points.map((pt) => (
          <g key={pt.month}>
            <text
              x={pt.x}
              y={pt.y - 7}
              textAnchor="middle"
              fontSize={compact ? "9.5" : "10.5"}
              fontWeight="700"
              fill={pt.isCurrent ? "#5E5BAE" : "#26263F"}
            >
              {pt.days}d
            </text>

            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.isCurrent ? "4" : "3.2"}
              fill={pt.isCurrent ? "#5E5BAE" : "#FFFFFF"}
              stroke="#5E5BAE"
              strokeWidth="2"
            />

            <text
              x={pt.x}
              y={textY}
              textAnchor="middle"
              fontSize={compact ? "9.5" : "10"}
              fontWeight={pt.isCurrent ? "700" : "500"}
              fill={pt.isCurrent ? "#5E5BAE" : "#7A7895"}
            >
              {pt.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Reusable Active Minutes Bar Chart Component
function ActiveMinutesBarChart({ timeframe }: { timeframe: '7d' | 'month' }) {
  const data = RHYTHM_RECENT_DATA[timeframe];
  const maxMinutes = timeframe === '7d' ? 25 : 80;

  return (
    <div className="flex items-end justify-between gap-2 h-24 pt-2 px-1 w-full select-none">
      {data.bars.map((bar, idx) => {
        const heightPercent = bar.isRest ? 18 : Math.max(16, (bar.minutes / maxMinutes) * 100);
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <span className={`text-[10px] font-semibold ${
              bar.isRest ? 'text-[#E59980]' : 'text-[#5E5BAE]'
            }`}>
              {bar.sublabel}
            </span>

            <div 
              className={`w-full rounded-[8px] transition-all duration-300 ${
                bar.isRest 
                  ? 'bg-[#F2D0C5] border border-[#E59980]/30' 
                  : 'bg-[#5E5BAE] shadow-2xs'
              }`}
              style={{ height: `${heightPercent}%` }}
            />

            <span className="text-[11px] font-medium text-[#7A7895]">
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT: MyPlanView
// ============================================================
interface MyPlanViewProps {
  onTalkToNova?: () => void;
  phoneFrameRef?: React.RefObject<HTMLDivElement | null>;
}

export function MyPlanView({ phoneFrameRef }: MyPlanViewProps) {
  // Rhythm Module State
  const [rhythmFilter, setRhythmFilter] = useState<'7d' | 'month'>('7d');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Direction Module State (Active vs Paused, Goal, Approach, Review Date)
  const [direction, setDirection] = useState<DirectionState>(DEFAULT_DIRECTION);
  
  // Direction Edit Draft State (Only committed after user confirmation!)
  const [isEditingDirection, setIsEditingDirection] = useState(false);
  const [directionDraft, setDirectionDraft] = useState<DirectionState>(DEFAULT_DIRECTION);
  const [showSaveSuccessBanner, setShowSaveSuccessBanner] = useState(false);

  // Health Data State (Demo Toggle: Connected vs Not Connected)
  // By default, connected to sample preview to showcase UI, with full toggle to demonstrate "Not connected / No data" (no zeros!)
  const [isAppleHealthConnected, setIsAppleHealthConnected] = useState<boolean>(true);

  // Secondary Detail Sheet Module Selection
  const [selectedModule, setSelectedModule] = useState<'activity' | 'rhythm' | 'direction' | 'health' | null>(null);

  // ------------------------------------------------------------
  // Activity Module State (Local State, Synchronous Updates)
  // ------------------------------------------------------------
  const deviceToday = useMemo(() => getDeviceLocalDate(), []);
  const [activityLogs, setActivityLogs] = useState<Record<string, DayActivityRecord>>(generateInitialActivityLogs);
  const [viewYear, setViewYear] = useState<number>(() => getDeviceLocalDate().year);
  const [viewMonth, setViewMonth] = useState<number>(() => getDeviceLocalDate().month);
  const [pickerYear, setPickerYear] = useState<number>(() => getDeviceLocalDate().year);
  const [slideDirection, setSlideDirection] = useState<number>(0); // -1 or 1 for animation
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [activeDayModalDate, setActiveDayModalDate] = useState<string | null>(null);

  // Day Detail Draft State for Log / Correct
  const [dayDraftType, setDayDraftType] = useState<ActivityRecordType>('active');
  const [dayDraftTitle, setDayDraftTitle] = useState<string>('');
  const [dayDraftDuration, setDayDraftDuration] = useState<number>(15);
  const [dayDraftNote, setDayDraftNote] = useState<string>('');
  const [dayUpdateToast, setDayUpdateToast] = useState<string | null>(null);

  // Debounce lock to guarantee strictly one month switch per gesture
  const isMonthSwitchingRef = useRef<boolean>(false);

  const isCurrentMonth = viewYear === deviceToday.year && viewMonth === deviceToday.month;

  // Month Switch Handlers (Seamless cross-year wrapping with single-swipe guarantee)
  const handlePrevMonth = () => {
    if (isMonthSwitchingRef.current) return;
    isMonthSwitchingRef.current = true;
    setTimeout(() => { isMonthSwitchingRef.current = false; }, 280);

    setSlideDirection(-1);
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isMonthSwitchingRef.current) return;
    isMonthSwitchingRef.current = true;
    setTimeout(() => { isMonthSwitchingRef.current = false; }, 280);

    setSlideDirection(1);
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleJumpToThisMonth = () => {
    const now = getDeviceLocalDate();
    setSlideDirection(
      viewYear > now.year || (viewYear === now.year && viewMonth > now.month) ? -1 : 1
    );
    setViewYear(now.year);
    setViewMonth(now.month);
  };

  const handleSelectMonth = (year: number, month: number) => {
    setSlideDirection(year > viewYear || (year === viewYear && month > viewMonth) ? 1 : -1);
    setViewYear(year);
    setViewMonth(month);
    setIsMonthPickerOpen(false);
  };

  // Day Tap Handler: open modal and prefill current day data (strictly NO prefill if unrecorded)
  const handleOpenDayDetail = (dateStr: string) => {
    const existing = activityLogs[dateStr];
    setActiveDayModalDate(dateStr);
    if (existing) {
      setDayDraftType(existing.type);
      setDayDraftTitle(existing.title || (existing.type === 'active' ? '' : 'Mindful rest day'));
      setDayDraftDuration(existing.durationMinutes || (existing.type === 'active' ? 15 : 0));
      setDayDraftNote(existing.note || '');
    } else {
      // Do NOT prefill any specific movement on unrecorded days
      setDayDraftType('active');
      setDayDraftTitle('');
      setDayDraftDuration(15);
      setDayDraftNote('');
    }
  };

  // Save Day Record (Log or Correct) with synchronous state update
  const handleSaveDayRecord = () => {
    if (!activeDayModalDate) return;

    setActivityLogs(prev => {
      const next = { ...prev };
      if (dayDraftType === 'none') {
        delete next[activeDayModalDate];
      } else {
        next[activeDayModalDate] = {
          date: activeDayModalDate,
          type: dayDraftType,
          title: dayDraftTitle || (dayDraftType === 'active' ? 'Mindful session' : 'Mindful rest day'),
          durationMinutes: dayDraftType === 'active' ? dayDraftDuration : 0,
          category: dayDraftType === 'active' ? 'walk' : 'rest',
          note: dayDraftNote,
          isSample: false,
          updatedAt: 'Just now'
        };
      }
      return next;
    });

    const parsedDate = new Date(activeDayModalDate + 'T00:00:00');
    const monthAbbr = MONTH_NAMES[parsedDate.getMonth()].slice(0, 3);
    const dayNum = parsedDate.getDate();
    const actionLabel = dayDraftType === 'active' 
      ? `${dayDraftDuration}m active saved` 
      : dayDraftType === 'rest' 
      ? 'Rest day saved' 
      : 'Record cleared';

    setDayUpdateToast(`${monthAbbr} ${dayNum}: ${actionLabel}`);
    setTimeout(() => setDayUpdateToast(null), 2500);
    setActiveDayModalDate(null);
  };

  // Dynamic monthly metrics calculation
  const currentMonthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const currentMonthRecords = Object.values(activityLogs).filter(r => r.date.startsWith(currentMonthPrefix));
  const activeDaysCount = currentMonthRecords.filter(r => r.type === 'active').length;
  const restDaysCount = currentMonthRecords.filter(r => r.type === 'rest').length;
  const totalMinutes = currentMonthRecords.reduce((sum, r) => sum + (r.durationMinutes || (r.type === 'active' ? 15 : 0)), 0);

  // Month days generation for compact grid
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  const currentRecentData = RHYTHM_RECENT_DATA[rhythmFilter];

  // Helper to start editing direction with a clean cloned draft
  const handleStartEditDirection = () => {
    setDirectionDraft({ ...direction });
    setIsEditingDirection(true);
  };

  // Helper to apply confirmed direction changes
  const handleConfirmDirectionChanges = () => {
    setDirection({ ...directionDraft });
    setIsEditingDirection(false);
    setShowSaveSuccessBanner(true);
    setTimeout(() => setShowSaveSuccessBanner(false), 2400);
  };

  // Helper to cancel editing
  const handleCancelDirectionChanges = () => {
    setDirectionDraft({ ...direction });
    setIsEditingDirection(false);
  };

  // Helper to toggle pause/resume with immediate confirmation
  const handleTogglePausePlan = () => {
    const nextStatus = direction.status === 'active' ? 'paused' : 'active';
    setDirection(prev => ({ ...prev, status: nextStatus }));
    setShowSaveSuccessBanner(true);
    setTimeout(() => setShowSaveSuccessBanner(false), 2400);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-2 pb-10 flex flex-col gap-4 scrollbar-none overscroll-contain z-10 text-[#26263F]">
      
      {/* Save Success Alert Banner */}
      <AnimatePresence>
        {showSaveSuccessBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#5E5BAE] text-white px-4 py-2.5 rounded-[18px] text-xs font-semibold shadow-md flex items-center justify-between z-20 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Plan updated successfully</span>
            </div>
            <span className="text-[11px] text-white/80">Saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Update Toast Banner */}
      <AnimatePresence>
        {dayUpdateToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#5E5BAE] text-white px-4 py-2.5 rounded-[18px] text-xs font-semibold shadow-md flex items-center justify-between z-20 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{dayUpdateToast}</span>
            </div>
            <span className="text-[11px] text-white/80">Updated</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 1. Module: Activity (Compact Illuminated Monthly Grid)       */}
      {/* ============================================================ */}
      <section 
        className="bg-white/70 backdrop-blur-md rounded-[24px] p-5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] flex flex-col gap-3 relative"
        aria-label="Activity Monthly Records"
      >
        {/* Module Header & Month Switcher (No < > or + buttons!) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#26263F] tracking-tight">Activity</span>
            {/* Clickable Month Selector Pill */}
            <button
              type="button"
              onClick={() => {
                setPickerYear(viewYear);
                setIsMonthPickerOpen(true);
              }}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#26263F] bg-[#26263F]/[0.05] hover:bg-[#26263F]/[0.09] active:scale-95 px-2.5 py-1 rounded-full transition-all cursor-pointer"
              aria-label="Select month"
            >
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#5E5BAE] opacity-75" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentMonth ? (
              <button
                type="button"
                onClick={handleJumpToThisMonth}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#5E5BAE] bg-[#5E5BAE]/10 hover:bg-[#5E5BAE]/18 active:scale-95 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                aria-label="Return to this month"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                <span>This month</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedModule('activity')}
                className="flex items-center text-xs font-semibold text-[#5E5BAE] hover:translate-x-0.5 transition-transform cursor-pointer"
                aria-label="View Activity history"
              >
                <span>History</span>
                <ChevronRight className="w-4 h-4 ml-0.5 stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>

        {/* Weekday indicators */}
        <div className="grid grid-cols-7 gap-1.5 text-center select-none pt-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayInitial, idx) => (
            <span key={idx} className="text-[9.5px] font-bold text-[#8C8AA3] uppercase tracking-wider">
              {dayInitial}
            </span>
          ))}
        </div>

        {/* Compact Monthly Illuminated Dot Grid with Single Drag Swipe Handler */}
        <div className="relative select-none overflow-hidden touch-pan-y">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0, x: slideDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x > 40) handlePrevMonth();
              else if (info.offset.x < -40) handleNextMonth();
            }}
            className="grid grid-cols-7 gap-1.5 cursor-grab active:cursor-grabbing py-1"
          >
            {/* Empty prefix slots before the 1st day */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-prefix-${idx}`} className="aspect-square w-full" />
            ))}

            {/* Illuminated day cells - strictly NO numbers or counts inside */}
            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((dayNum) => {
              const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const record = activityLogs[dStr];
              const isToday = viewYear === deviceToday.year && viewMonth === deviceToday.month && dayNum === deviceToday.day;
              const isFuture = (viewYear > deviceToday.year) || 
                               (viewYear === deviceToday.year && viewMonth > deviceToday.month) || 
                               (viewYear === deviceToday.year && viewMonth === deviceToday.month && dayNum > deviceToday.day);

              return (
                <button
                  type="button"
                  key={dStr}
                  onClick={() => handleOpenDayDetail(dStr)}
                  aria-label={`${dStr}: ${record?.type || 'no record'}`}
                  className={`aspect-square w-full max-w-[34px] mx-auto rounded-[8px] flex items-center justify-center transition-all duration-150 relative cursor-pointer active:scale-88 ${
                    isToday ? 'ring-2 ring-[#5E5BAE] ring-offset-2 ring-offset-white/80' : ''
                  } ${
                    record?.type === 'active'
                      ? 'bg-[#5E5BAE] shadow-[0_2px_8px_rgba(94,91,174,0.32)] hover:brightness-105'
                      : record?.type === 'rest'
                      ? 'bg-[#E59980] shadow-[0_2px_8px_rgba(229,153,128,0.32)] hover:brightness-105'
                      : isFuture
                      ? 'bg-[#26263F]/[0.025] border border-dashed border-[#26263F]/15 hover:bg-[#26263F]/[0.08]'
                      : 'bg-[#26263F]/[0.07] hover:bg-[#26263F]/[0.14]'
                  }`}
                >
                  {/* Subtle white micro-dot to denote today without displaying numbers */}
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-1 right-1 shadow-xs pointer-events-none" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Legend & Gesture Hint (Numerical stats removed per requirement) */}
        <div className="pt-2 border-t border-[#26263F]/[0.06] flex items-center justify-between text-[11px] text-[#7A7895]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#5E5BAE]" />
              <span className="text-[#26263F] font-medium">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#E59980]" />
              <span className="text-[#26263F] font-medium">Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#26263F]/15" />
              <span>No record</span>
            </div>
          </div>
          <span className="text-[10px] text-[#8C8AA3] italic">Swipe to switch month</span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. Module: Your rhythm (Long-term curve & recent data)        */}
      {/* ============================================================ */}
      <section 
        className="bg-white/70 backdrop-blur-md rounded-[24px] p-5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] flex flex-col gap-4 relative"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#26263F] tracking-tight">Your rhythm</span>
            <span className="text-[12px] font-medium text-[#7A7895] bg-[#26263F]/[0.04] px-2.5 py-0.5 rounded-full">
              Trends & Habits
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#7A7895]">
            Days & minutes
          </span>
        </div>

        {/* Upper Half: Long-term Trend Curve (Monthly Active Days) */}
        <div className="bg-white/55 p-3.5 rounded-[20px] border border-white/75 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold text-[#26263F] tracking-tight">
              Monthly active days
            </span>
            <span className="text-[10.5px] font-medium text-[#7A7895]">
              6-month trend (days/mo)
            </span>
          </div>
          
          <MonthlyTrendCurve compact={true} />
        </div>

        {/* Lower Half: Recent Data with 7 days / Month Filter */}
        <div className="flex flex-col gap-3 pt-1 border-t border-[#26263F]/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#26263F]">
              Recent data
            </span>
            <div className="bg-[#26263F]/[0.06] p-0.5 rounded-full inline-flex">
              <button
                type="button"
                onClick={() => setRhythmFilter('7d')}
                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                  rhythmFilter === '7d'
                    ? 'bg-white text-[#5E5BAE] font-bold shadow-2xs'
                    : 'text-[#7A7895] font-medium hover:text-[#26263F]'
                }`}
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => setRhythmFilter('month')}
                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                  rhythmFilter === 'month'
                    ? 'bg-white text-[#5E5BAE] font-bold shadow-2xs'
                    : 'text-[#7A7895] font-medium hover:text-[#26263F]'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/60 p-3 rounded-[16px] border border-white/75 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-[#7A7895]">Completed activities</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[20px] font-bold text-[#26263F] leading-none">
                  {currentRecentData.completedCount}
                </span>
                <span className="text-[11px] text-[#7A7895]">sessions</span>
              </div>
            </div>

            <div className="bg-white/60 p-3 rounded-[16px] border border-white/75 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-[#7A7895]">Recorded duration</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[20px] font-bold text-[#26263F] leading-none">
                  {currentRecentData.activeMinutes}
                </span>
                <span className="text-[11px] text-[#7A7895]">min total</span>
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedModule('rhythm')}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('rhythm')}
            className="group bg-white/80 hover:bg-white/95 active:scale-[0.99] transition-all duration-150 p-3.5 rounded-[18px] border border-white/90 shadow-2xs cursor-pointer flex flex-col gap-2 relative"
            aria-label="View rhythm details from Nova observation"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5E5BAE]">
                <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                <span>Nova noticed</span>
              </div>
              <div className="flex items-center text-[11px] font-semibold text-[#5E5BAE] group-hover:translate-x-0.5 transition-transform">
                <span>View details</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5 stroke-[2.2]" />
              </div>
            </div>
            
            <p className="text-[12.5px] text-[#26263F] leading-relaxed pr-2">
              “{currentRecentData.novaObservation}”
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. Module: Your direction (Refined Primary View)              */}
      {/* - Current goal & concise explanation                         */}
      {/* - Current execution approach                                 */}
      {/* - Plan status & next review date                             */}
      {/* - Dedicated entry to details                                 */}
      {/* ============================================================ */}
      <section 
        onClick={() => setSelectedModule('direction')}
        className="group bg-white/70 hover:bg-white/85 transition-all duration-200 backdrop-blur-md rounded-[24px] p-5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] cursor-pointer flex flex-col gap-3.5 relative"
        role="button"
        tabIndex={0}
        aria-label="View Your Direction details"
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('direction')}
      >
        {/* Header with status pill and details entry */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#26263F] tracking-tight">Your direction</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              direction.status === 'active'
                ? 'text-[#5E5BAE] bg-[#5E5BAE]/10 border border-[#5E5BAE]/20'
                : 'text-[#C27838] bg-[#FEF3EB] border border-[#FAD7B8]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${direction.status === 'active' ? 'bg-[#5E5BAE] animate-pulse' : 'bg-[#C27838]'}`} />
              {direction.status === 'active' ? 'Active' : 'Paused'}
            </span>
          </div>

          {/* Single clear entry point to details */}
          <div className="flex items-center text-xs font-semibold text-[#5E5BAE] group-hover:translate-x-0.5 transition-transform">
            <span>Details</span>
            <ChevronRight className="w-4 h-4 ml-0.5 stroke-[2.2]" />
          </div>
        </div>

        {/* 1. Current Goal & Concise Explanation */}
        <div className="bg-white/60 p-3.5 rounded-[18px] border border-white/75 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6865B8]">
            <Compass className="w-4 h-4 stroke-[2.2]" />
            <span className="uppercase text-[10.5px] tracking-wider">Current Goal</span>
          </div>
          <h4 className="text-[15px] font-bold text-[#26263F] tracking-tight">
            {direction.goalTitle}
          </h4>
          <p className="text-[12px] text-[#5D5B78] leading-relaxed">
            {direction.description}
          </p>
        </div>

        {/* 2. Current Execution Approach */}
        <div className="bg-white/60 p-3.5 rounded-[18px] border border-white/75 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6865B8]">
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
            <span className="uppercase text-[10.5px] tracking-wider">Current Approach</span>
          </div>
          <p className="text-[12px] font-medium text-[#26263F] leading-snug">
            {direction.executionApproach}
          </p>
        </div>

        {/* 3. Plan Status & Next Review Date */}
        <div className="pt-1 flex items-center justify-between text-xs text-[#7A7895] border-t border-[#26263F]/[0.06]">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 stroke-[2]" />
            <span>Next review: <strong className="text-[#26263F] font-semibold">{direction.nextReviewDate}</strong></span>
          </div>
          <span className="text-[11px] font-medium bg-[#26263F]/[0.04] px-2 py-0.5 rounded-full">
            {direction.reviewDaysLeft} days left
          </span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. Module: Health data (Refined Primary View)                */}
      {/* - Apple Health connection status                             */}
      {/* - Key metrics (Fallback to "Not connected / No data", NO 0s) */}
      {/* - Clear frontend demo notice                                 */}
      {/* ============================================================ */}
      <section 
        onClick={() => setSelectedModule('health')}
        className="group bg-white/70 hover:bg-white/85 transition-all duration-200 backdrop-blur-md rounded-[24px] p-5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] cursor-pointer flex flex-col gap-3.5 relative"
        role="button"
        tabIndex={0}
        aria-label="View Apple Health data details"
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('health')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#26263F] tracking-tight">Health data</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isAppleHealthConnected 
                ? 'text-[#E11D48] bg-[#FFE4E6]/80' 
                : 'text-[#7A7895] bg-[#26263F]/[0.05]'
            }`}>
              <Heart className="w-3 h-3 fill-current" />
              {isAppleHealthConnected ? 'Sample sync' : 'Not connected'}
            </span>
          </div>

          <div className="flex items-center text-xs font-semibold text-[#5E5BAE] group-hover:translate-x-0.5 transition-transform">
            <span>Details</span>
            <ChevronRight className="w-4 h-4 ml-0.5 stroke-[2.2]" />
          </div>
        </div>

        {/* 2x2 Clean Metrics Grid */}
        {/* CRITICAL RULE: When not connected, displays "Not connected / No data", NEVER 0 */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          {HEALTH_METRICS_DEFINITIONS.map((metric) => {
            const IconComponent = metric.icon;
            const displayValue = isAppleHealthConnected 
              ? metric.sampleValue 
              : (metric.id === 'rhr' ? 'Not connected' : 'No data');
            const displayUnit = isAppleHealthConnected ? metric.unit : '';
            const displayStatus = isAppleHealthConnected ? metric.trend : 'Requires Apple Health';

            return (
              <div 
                key={metric.id}
                className="bg-white/60 p-3 rounded-[18px] border border-white/70 flex flex-col justify-between min-h-[96px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-medium text-[#7A7895] line-clamp-1">{metric.name}</span>
                  <div className={`w-5 h-5 rounded-full ${metric.iconBg} ${metric.iconColor} flex items-center justify-center shrink-0`}>
                    <IconComponent className="w-3 h-3 stroke-[2.2]" />
                  </div>
                </div>

                <div className="mt-1">
                  <div className="flex items-baseline gap-1">
                    <span className={`font-bold text-[#26263F] tracking-tight leading-none ${
                      isAppleHealthConnected ? 'text-[20px]' : 'text-[13px] text-[#8E8EA8]'
                    }`}>
                      {displayValue}
                    </span>
                    {displayUnit && (
                      <span className="text-[11px] text-[#7A7895] font-medium">{displayUnit}</span>
                    )}
                  </div>
                  <span className="text-[10.5px] text-[#5D5B78] mt-1.5 block truncate font-medium">
                    {displayStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sample data transparency note */}
        <div className="pt-2 border-t border-[#26263F]/[0.06] flex items-center justify-between text-[11px] text-[#7A7895]">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 stroke-[2]" />
            {isAppleHealthConnected ? 'Sample data preview (Demo)' : 'Not connected (Demo)'}
          </span>
          <span>Read-only sync</span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECONDARY DETAIL SHEETS (Rendered via React Portal)           */}
      {/* ============================================================ */}
      {(() => {
        const sheetPortalContent = (
          <AnimatePresence>
            {selectedModule && (
              <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
                {/* Dimmed backdrop */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    setSelectedModule(null);
                    setIsEditingDirection(false);
                  }}
                  className="absolute inset-0 bg-black/25 backdrop-blur-xs"
                />

                {/* Slide-up Sheet */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="relative w-full max-h-[88%] bg-[#FAF7F2] rounded-t-[32px] p-6 shadow-2xl border-t border-white/90 overflow-y-auto z-10 flex flex-col gap-4 text-[#26263F]"
                  id="my-plan-secondary-sheet"
                >
                  {/* Sheet Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#26263F]/[0.06] shrink-0">
                    <div>
                      <h3 className="text-[18px] font-bold text-[#26263F]">
                        {selectedModule === 'activity' && 'Activity History'}
                        {selectedModule === 'rhythm' && 'Your rhythm'}
                        {selectedModule === 'direction' && 'Your direction'}
                        {selectedModule === 'health' && 'Health data'}
                      </h3>
                      <span className="text-[11px] text-[#7A7895]">
                        {selectedModule === 'activity' && 'Monthly action log & intervals'}
                        {selectedModule === 'rhythm' && 'Long-term trends & recent summary'}
                        {selectedModule === 'direction' && 'Mid-to-long term health pacing'}
                        {selectedModule === 'health' && 'Apple Health integration & metrics'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModule(null);
                        setIsEditingDirection(false);
                      }}
                      className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] transition-colors cursor-pointer"
                      aria-label="Close detail"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 1: YOUR RHYTHM                           */}
                  {/* ======================================================= */}
                  {selectedModule === 'rhythm' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      <div className="flex items-center justify-between bg-white/75 p-1 rounded-full border border-white/90 shadow-2xs">
                        <span className="text-xs font-semibold text-[#26263F] pl-3">
                          Time range
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRhythmFilter('7d')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              rhythmFilter === '7d'
                                ? 'bg-[#5E5BAE] text-white shadow-2xs'
                                : 'text-[#7A7895] hover:text-[#26263F]'
                            }`}
                          >
                            7 days
                          </button>
                          <button
                            type="button"
                            onClick={() => setRhythmFilter('month')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              rhythmFilter === 'month'
                                ? 'bg-[#5E5BAE] text-white shadow-2xs'
                                : 'text-[#7A7895] hover:text-[#26263F]'
                            }`}
                          >
                            Month
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#5E5BAE]/[0.08] p-3.5 rounded-[20px] border border-[#5E5BAE]/20 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                          <span>Nova noticed</span>
                        </div>
                        <p className="text-[12.5px] leading-relaxed text-[#26263F]">
                          “{currentRecentData.novaObservation}”
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/75 p-3 rounded-[18px] border border-white/85 flex flex-col justify-between">
                          <span className="text-[10.5px] font-medium text-[#7A7895]">Completed</span>
                          <div className="mt-1">
                            <span className="text-[18px] font-bold text-[#26263F] leading-none">
                              {currentRecentData.completedCount}
                            </span>
                            <span className="text-[10px] text-[#7A7895] block mt-0.5">sessions</span>
                          </div>
                        </div>

                        <div className="bg-white/75 p-3 rounded-[18px] border border-white/85 flex flex-col justify-between">
                          <span className="text-[10.5px] font-medium text-[#7A7895]">Active time</span>
                          <div className="mt-1">
                            <span className="text-[18px] font-bold text-[#26263F] leading-none">
                              {currentRecentData.activeMinutes}
                            </span>
                            <span className="text-[10px] text-[#7A7895] block mt-0.5">minutes</span>
                          </div>
                        </div>

                        <div className="bg-white/75 p-3 rounded-[18px] border border-white/85 flex flex-col justify-between">
                          <span className="text-[10.5px] font-medium text-[#7A7895]">Rest days</span>
                          <div className="mt-1">
                            <span className="text-[18px] font-bold text-[#E59980] leading-none">
                              {currentRecentData.restDaysCount}
                            </span>
                            <span className="text-[10px] text-[#7A7895] block mt-0.5">rest days</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/75 p-4 rounded-[22px] border border-white/85 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <BarChart2 className="w-3.5 h-3.5 text-[#5E5BAE]" />
                            <span className="font-bold text-[#26263F] text-[12.5px]">
                              Active minutes ({rhythmFilter === '7d' ? 'by day' : 'by week'})
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-[#5E5BAE]">
                            {currentRecentData.activeMinutes} min total
                          </span>
                        </div>
                        
                        <ActiveMinutesBarChart timeframe={rhythmFilter} />
                        
                        <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10.5px] text-[#7A7895]">
                          <span>Purple bars: Guided resets</span>
                          <span className="text-[#E59980]">Peach bars: Rest days</span>
                        </div>
                      </div>

                      <div className="bg-white/75 p-4 rounded-[22px] border border-white/85 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-[#5E5BAE]" />
                            <span className="font-bold text-[#26263F] text-[12.5px]">
                              Monthly active days (Long-term trend)
                            </span>
                          </div>
                          <span className="text-[11px] text-[#7A7895]">
                            Jun – Nov 2026
                          </span>
                        </div>

                        <MonthlyTrendCurve compact={false} />

                        <p className="text-[11px] text-[#7A7895] pt-1 leading-relaxed">
                          Reflects days with recorded activity. Stable consistency without burnout.
                        </p>
                      </div>

                      <div className="bg-white/75 p-4 rounded-[22px] border border-white/85 flex flex-col gap-2.5">
                        <span className="font-bold text-[#26263F] text-[12.5px]">
                          Action breakdown ({currentRecentData.rangeLabel})
                        </span>
                        
                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div className="bg-white/70 p-2.5 rounded-[16px] border border-white/80">
                            <div className="w-2 h-2 rounded-full bg-[#5E5BAE] mx-auto mb-1" />
                            <div className="text-[16px] font-bold text-[#26263F]">
                              {currentRecentData.completedCount}
                            </div>
                            <span className="text-[10px] text-[#7A7895]">Completed</span>
                          </div>

                          <div className="bg-white/70 p-2.5 rounded-[16px] border border-white/80">
                            <div className="w-2 h-2 rounded-full bg-[#8E8CD6] mx-auto mb-1" />
                            <div className="text-[16px] font-bold text-[#26263F]">
                              {currentRecentData.rescheduledCount}
                            </div>
                            <span className="text-[10px] text-[#7A7895]">Rescheduled</span>
                          </div>

                          <div className="bg-white/70 p-2.5 rounded-[16px] border border-white/80">
                            <div className="w-2 h-2 rounded-full bg-[#E59980] mx-auto mb-1" />
                            <div className="text-[16px] font-bold text-[#26263F]">
                              {currentRecentData.restDaysCount}
                            </div>
                            <span className="text-[10px] text-[#7A7895]">Rest days</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMethodologyOpen(true)}
                        className="w-full py-2.5 px-3 rounded-[16px] bg-white/60 hover:bg-white/85 border border-white/80 text-[11.5px] font-medium text-[#7A7895] hover:text-[#26263F] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
                        <span>Data source & calculation methodology</span>
                      </button>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 2: YOUR DIRECTION (Refined Details)      */}
                  {/* - Mobile-friendly short content structure               */}
                  {/* - Displays Goal, Current approach & Tailored pacing     */}
                  {/* - Adjust Goal/Approach & Pause/Resume plan              */}
                  {/* - USER CONFIRMATION REQUIRED BEFORE APPLYING            */}
                  {/* ======================================================= */}
                  {selectedModule === 'direction' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      
                      {/* Read View: Short clean mobile structure */}
                      {!isEditingDirection && (
                        <>
                          {/* Plan Status Header Pill */}
                          <div className="flex items-center justify-between p-3.5 rounded-[20px] bg-white/75 border border-white/85">
                            <div>
                              <span className="text-[10.5px] uppercase font-bold text-[#7A7895] tracking-wider block">
                                Plan Status
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${direction.status === 'active' ? 'bg-[#5E5BAE]' : 'bg-[#C27838]'}`} />
                                <span className="text-[14px] font-bold text-[#26263F]">
                                  {direction.status === 'active' ? 'Active & Paced' : 'Paused for Recovery'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleTogglePausePlan}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                                direction.status === 'active'
                                  ? 'bg-[#FAF8FD] text-[#5E5BAE] border-[#5E5BAE]/25 hover:bg-[#F3EEFE]'
                                  : 'bg-[#5E5BAE] text-white border-transparent'
                              }`}
                            >
                              {direction.status === 'active' ? (
                                <>
                                  <Pause className="w-3 h-3 stroke-[2.4]" />
                                  <span>Pause Plan</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Resume Plan</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* 1. Goal Card */}
                          <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Compass className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Current Goal</span>
                            </div>
                            <h4 className="text-[16px] font-bold text-[#26263F] leading-tight">
                              {direction.goalTitle}
                            </h4>
                            <p className="text-[12.5px] leading-relaxed text-[#5D5B78]">
                              {direction.description}
                            </p>
                          </div>

                          {/* 2. Current Approach */}
                          <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Current Execution Approach</span>
                            </div>
                            <p className="text-[13px] font-medium text-[#26263F] leading-relaxed">
                              {direction.executionApproach}
                            </p>
                          </div>

                          {/* 3. Tailored Pacing (Why it fits the user) */}
                          <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                              <span>Tailored for your rhythm</span>
                            </div>
                            <p className="text-[12.5px] leading-relaxed text-[#26263F]">
                              {direction.tailoredReason}
                            </p>
                          </div>

                          {/* Review Schedule Footer */}
                          <div className="p-3.5 rounded-[18px] bg-white/55 border border-white/75 flex items-center justify-between text-xs text-[#7A7895]">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Next review: <strong className="text-[#26263F]">{direction.nextReviewDate}</strong></span>
                            </div>
                            <span>{direction.reviewDaysLeft} days remaining</span>
                          </div>

                          {/* Adjust Button */}
                          <button
                            type="button"
                            onClick={handleStartEditDirection}
                            className="w-full py-3 rounded-[18px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
                          >
                            <Sliders className="w-4 h-4 stroke-[2]" />
                            <span>Adjust Goal, Description or Approach</span>
                          </button>
                        </>
                      )}

                      {/* Edit View: User Confirmation is strictly enforced before applying */}
                      {isEditingDirection && (
                        <div className="flex flex-col gap-4">
                          <div className="bg-[#5E5BAE]/[0.08] p-3 rounded-[18px] border border-[#5E5BAE]/20 text-xs text-[#5E5BAE] flex items-center gap-2">
                            <Sliders className="w-4 h-4 stroke-[2] shrink-0" />
                            <span>Adjusting direction. Changes apply only after you confirm below.</span>
                          </div>

                          {/* 1. Pick or switch Goal */}
                          <div className="flex flex-col gap-2">
                            <span className="font-bold text-[#26263F] text-xs">
                              Select Health Focus Goal:
                            </span>
                            <div className="space-y-2">
                              {PRESET_DIRECTION_GOALS.map((preset) => {
                                const isSelected = directionDraft.goalId === preset.id;
                                return (
                                  <div
                                    key={preset.id}
                                    onClick={() => {
                                      setDirectionDraft(prev => ({
                                        ...prev,
                                        goalId: preset.id,
                                        goalTitle: preset.title,
                                        description: preset.description,
                                        executionApproach: preset.defaultApproach,
                                        tailoredReason: preset.tailoredReason
                                      }));
                                    }}
                                    className={`p-3 rounded-[16px] border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-white border-[#5E5BAE] shadow-2xs ring-1 ring-[#5E5BAE]/20'
                                        : 'bg-white/60 border-white/75 hover:bg-white/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[13px] font-bold ${isSelected ? 'text-[#5E5BAE]' : 'text-[#26263F]'}`}>
                                        {preset.title}
                                      </span>
                                      {isSelected && <Check className="w-4 h-4 text-[#5E5BAE] stroke-[2.5]" />}
                                    </div>
                                    <p className="text-[11.5px] text-[#7A7895] mt-1 leading-relaxed">
                                      {preset.description}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Customize Execution Approach */}
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-[#26263F] text-xs">
                              Execution Approach:
                            </span>
                            <textarea
                              rows={2}
                              value={directionDraft.executionApproach}
                              onChange={(e) => setDirectionDraft(prev => ({ ...prev, executionApproach: e.target.value }))}
                              className="w-full bg-white p-3 rounded-[16px] border border-[#26263F]/10 text-xs text-[#26263F] outline-none focus:border-[#5E5BAE] transition-all resize-none shadow-2xs"
                              placeholder="Describe your execution pace and time window..."
                            />
                          </div>

                          {/* 3. Pause or Active Status Selection */}
                          <div className="flex items-center justify-between p-3 rounded-[16px] bg-white/70 border border-white/85">
                            <span className="font-bold text-[#26263F] text-xs">
                              Plan Status:
                            </span>
                            <div className="bg-[#26263F]/[0.06] p-0.5 rounded-full inline-flex">
                              <button
                                type="button"
                                onClick={() => setDirectionDraft(prev => ({ ...prev, status: 'active' }))}
                                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                                  directionDraft.status === 'active'
                                    ? 'bg-[#5E5BAE] text-white font-bold shadow-2xs'
                                    : 'text-[#7A7895] font-medium'
                                }`}
                              >
                                Active
                              </button>
                              <button
                                type="button"
                                onClick={() => setDirectionDraft(prev => ({ ...prev, status: 'paused' }))}
                                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                                  directionDraft.status === 'paused'
                                    ? 'bg-[#C27838] text-white font-bold shadow-2xs'
                                    : 'text-[#7A7895] font-medium'
                                }`}
                              >
                                Paused
                              </button>
                            </div>
                          </div>

                          {/* Actions: Cancel vs Confirm Changes (Strict Confirmation Barrier) */}
                          <div className="flex items-center gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={handleCancelDirectionChanges}
                              className="flex-1 py-3 rounded-[16px] bg-white/80 hover:bg-white text-[#7A7895] text-xs font-semibold border border-white/90 active:scale-[0.98] transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmDirectionChanges}
                              className="flex-1 py-3 rounded-[16px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Confirm Changes</span>
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 3: HEALTH DATA (Apple Health Details)    */}
                  {/* - Metrics list with Source & Last Updated timestamp     */}
                  {/* - Explanation of how Plan B uses health data            */}
                  {/* - Explicit notice: Plan works fully without Apple Health */}
                  {/* - Interactive Demo Connection Toggle                    */}
                  {/* ======================================================= */}
                  {selectedModule === 'health' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      
                      {/* 1. Connection Status Card & Demo Switcher */}
                      <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
                              <Heart className="w-4 h-4 fill-current" />
                            </div>
                            <div>
                              <h4 className="text-[14px] font-bold text-[#26263F]">
                                Apple Health Connection
                              </h4>
                              <span className="text-[11px] text-[#7A7895]">
                                {isAppleHealthConnected ? 'Sample sync active (Demo)' : 'Not connected'}
                              </span>
                            </div>
                          </div>

                          {/* Demo Interactive Switch */}
                          <button
                            type="button"
                            onClick={() => setIsAppleHealthConnected(!isAppleHealthConnected)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                              isAppleHealthConnected
                                ? 'bg-white text-[#E11D48] border-[#E11D48]/30 hover:bg-[#FFE4E6]/20'
                                : 'bg-[#5E5BAE] text-white border-transparent'
                            }`}
                          >
                            {isAppleHealthConnected ? 'Disconnect' : 'Connect Demo'}
                          </button>
                        </div>

                        {/* Transparency Banner */}
                        <div className="p-3 rounded-[16px] bg-[#FAF8FD] border border-black/[0.04] text-[11.5px] leading-relaxed text-[#7A7895]">
                          {isAppleHealthConnected ? (
                            <span className="flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 text-[#5E5BAE] shrink-0 mt-0.5" />
                              <span>Frontend demo mode: Displays sample metrics with explicit attribution. No real HealthKit data is accessed.</span>
                            </span>
                          ) : (
                            <span className="flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-[#7A7895] shrink-0 mt-0.5" />
                              <span>Apple Health is not connected. All indicators display “Not connected / No data” rather than false zero counts.</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Metrics List with Source & Last Updated */}
                      <div className="flex flex-col gap-2.5">
                        <span className="font-bold text-[#26263F] text-xs">
                          Biometric Baseline Indicators
                        </span>

                        <div className="space-y-2.5">
                          {HEALTH_METRICS_DEFINITIONS.map((metric) => {
                            const IconComponent = metric.icon;
                            const isConnected = isAppleHealthConnected;
                            const valueText = isConnected ? metric.sampleValue : (metric.id === 'rhr' ? 'Not connected' : 'No data');
                            const unitText = isConnected ? metric.unit : '';
                            const lastUpdatedText = isConnected ? metric.lastUpdated : 'Not synced';
                            const sourceText = isConnected ? metric.source : 'None';

                            return (
                              <div
                                key={metric.id}
                                className="p-3.5 rounded-[20px] bg-white/75 border border-white/85 flex flex-col gap-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full ${metric.iconBg} ${metric.iconColor} flex items-center justify-center shrink-0`}>
                                      <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#26263F]">
                                      {metric.name}
                                    </span>
                                  </div>

                                  <div className="flex items-baseline gap-1">
                                    <span className={`font-bold text-[#26263F] ${isConnected ? 'text-[17px]' : 'text-[12px] text-[#8E8EA8]'}`}>
                                      {valueText}
                                    </span>
                                    {unitText && (
                                      <span className="text-[11px] text-[#7A7895]">{unitText}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-1.5 border-t border-black/[0.04] flex items-center justify-between text-[10.5px] text-[#7A7895]">
                                  <span>Source: <strong className="text-[#26263F] font-medium">{sourceText}</strong></span>
                                  <span>Updated: {lastUpdatedText}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Explanation: How Plan B Uses Health Data */}
                      <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                          <span>How Plan B uses health data</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#5D5B78]">
                          Plan B reads resting heart rate and sleep consistency solely to detect physiological fatigue and automatically soften daily recommendations into gentle 5-minute living room stretches.
                        </p>
                        <div className="pt-2 border-t border-black/[0.04] text-[11px] text-[#7A7895] leading-relaxed">
                          Your metrics are never used for competitive step rankings, fitness guilt scores, or streak penalties.
                        </div>
                      </div>

                      {/* 4. Reassuring Notice: Plan Works Fully Without Apple Health */}
                      <div className="p-4 rounded-[22px] bg-[#5E5BAE]/[0.08] border border-[#5E5BAE]/20 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                          <span>No Apple Health? No problem.</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#26263F]">
                          Plan B is completely functional without Apple Health or wearable sensors. Daily check-ins with Nova and manual progress tracking give you the complete experience.
                        </p>
                      </div>

                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 4: ACTIVITY HISTORY (Placeholder)        */}
                  {/* ======================================================= */}
                  {selectedModule === 'activity' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      {/* Month Summary Card */}
                      <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#5E5BAE]/10 text-[#5E5BAE] flex items-center justify-center font-bold">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-[14px] font-bold text-[#26263F]">
                                {MONTH_NAMES[viewMonth]} {viewYear}
                              </h4>
                              <span className="text-[11px] text-[#7A7895]">
                                Monthly pacing & log overview
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsMonthPickerOpen(true)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#5E5BAE]/10 hover:bg-[#5E5BAE]/20 text-[#5E5BAE] transition-all cursor-pointer"
                          >
                            Switch month
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/[0.04] text-center">
                          <div className="bg-[#FAF8FD] p-2.5 rounded-[14px]">
                            <span className="text-[16px] font-bold text-[#5E5BAE] block leading-none">{activeDaysCount}</span>
                            <span className="text-[10px] text-[#7A7895] mt-0.5 block">active days</span>
                          </div>
                          <div className="bg-[#FAF8FD] p-2.5 rounded-[14px]">
                            <span className="text-[16px] font-bold text-[#E59980] block leading-none">{restDaysCount}</span>
                            <span className="text-[10px] text-[#7A7895] mt-0.5 block">mindful rests</span>
                          </div>
                          <div className="bg-[#FAF8FD] p-2.5 rounded-[14px]">
                            <span className="text-[16px] font-bold text-[#26263F] block leading-none">{totalMinutes}m</span>
                            <span className="text-[10px] text-[#7A7895] mt-0.5 block">logged</span>
                          </div>
                        </div>
                      </div>

                      {/* Logged Records List */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#26263F] text-xs">
                            Recorded Actions & Rests ({currentMonthRecords.length})
                          </span>
                          <span className="text-[10.5px] text-[#7A7895]">
                            Tap edit to correct
                          </span>
                        </div>

                        {currentMonthRecords.length === 0 ? (
                          <div className="p-6 text-center rounded-[20px] bg-white/60 border border-black/[0.04] text-[#7A7895]">
                            No activity or rest recorded yet for this month. Tap any day on the calendar grid to log an action.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...currentMonthRecords]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((rec) => {
                                const dObj = new Date(rec.date + 'T00:00:00');
                                const isToday = rec.date === deviceToday.dateStr;
                                const dateLabel = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

                                return (
                                  <div
                                    key={rec.date}
                                    className="p-3.5 rounded-[18px] bg-white/80 border border-white/90 flex items-center justify-between shadow-2xs gap-3"
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div className={`w-3 h-3 rounded-[4px] mt-1 shrink-0 ${
                                        rec.type === 'active' ? 'bg-[#5E5BAE]' : 'bg-[#E59980]'
                                      }`} />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-[#26263F] text-[13px]">
                                            {dateLabel}
                                          </span>
                                          {isToday && (
                                            <span className="bg-[#5E5BAE] text-white text-[9.5px] px-1.5 py-0.2 rounded-full font-bold">
                                              Today
                                            </span>
                                          )}
                                          {rec.isSample && (
                                            <span className="text-[9.5px] text-[#7A7895] bg-black/[0.04] px-1.5 py-0.2 rounded-full">
                                              Sample
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[12px] text-[#5D5B78] mt-0.5 truncate">
                                          {rec.type === 'active' ? (
                                            <span>{rec.title} • {rec.durationMinutes}m</span>
                                          ) : (
                                            <span>{rec.title || 'Mindful rest day'}</span>
                                          )}
                                        </div>
                                        {rec.note && (
                                          <div className="text-[11px] text-[#8E8EA8] mt-0.5 italic truncate">
                                            “{rec.note}”
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenDayDetail(rec.date)}
                                      className="px-2.5 py-1 rounded-[10px] bg-black/[0.04] hover:bg-black/[0.08] text-[11px] font-semibold text-[#5E5BAE] shrink-0 transition-colors cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Prototype Transparency Notice */}
                      <div className="p-3.5 rounded-[18px] bg-[#5E5BAE]/[0.08] border border-[#5E5BAE]/20 text-[11px] text-[#5E5BAE] flex items-start gap-2">
                        <Check className="w-4 h-4 stroke-[2.2] shrink-0 mt-0.5" />
                        <span>All activity logs and adjustments are saved to local state and update the illuminated grid in real-time.</span>
                      </div>
                    </div>
                  )}

                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(sheetPortalContent, phoneFrameRef.current);
        }
        return sheetPortalContent;
      })()}

      {/* ============================================================ */}
      {/* Lightweight Methodology Modal (Data Sources & Definitions)   */}
      {/* ============================================================ */}
      {(() => {
        const infoModalContent = (
          <AnimatePresence>
            {isMethodologyOpen && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMethodologyOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="relative bg-[#FAF8FD] rounded-[24px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[320px] flex flex-col gap-3.5 text-[#26263F]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#26263F]/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#26263F]">How it’s measured</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMethodologyOpen(false)}
                      className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#5D5B78] leading-relaxed">
                    <div>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Monthly active days (days/month)
                      </strong>
                      Count of unique calendar days where at least 1 Plan B activity or gentle stretch was marked completed.
                    </div>

                    <div>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Active minutes (minutes)
                      </strong>
                      Cumulative duration of completed audio sessions and timer resets.
                    </div>

                    <div>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Rest days
                      </strong>
                      Logged rest periods are recognized as intentional health recovery, never marked as missed quotas.
                    </div>

                    <div className="pt-1.5 border-t border-black/[0.04] text-[11px] text-[#7A7895]">
                      All observations by Nova are generated strictly from recorded timestamps on-device without speculative extrapolation.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMethodologyOpen(false)}
                    className="w-full py-2.5 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-semibold shadow-2xs mt-1 transition-colors cursor-pointer"
                  >
                    Got it
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(infoModalContent, phoneFrameRef.current);
        }
        return infoModalContent;
      })()}

      {/* ============================================================ */}
      {/* Month Picker Modal (June 2026 – December 2026)               */}
      {/* ============================================================ */}
      {(() => {
        const monthPickerModalContent = (
          <AnimatePresence>
            {isMonthPickerOpen && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-5 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  className="relative bg-[#FAF8FD] rounded-[26px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[325px] flex flex-col gap-3 text-[#26263F]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#26263F]/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#26263F]">Select Month</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMonthPickerOpen(false)}
                      className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Year Switcher for Cross-Year Selection */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/[0.03] rounded-[14px]">
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y - 1)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#5E5BAE] hover:bg-black/5 active:scale-95 rounded-[8px] transition-all cursor-pointer"
                      aria-label="Previous year"
                    >
                      ‹ {pickerYear - 1}
                    </button>
                    <span className="text-[13px] font-bold text-[#26263F]">
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y + 1)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#5E5BAE] hover:bg-black/5 active:scale-95 rounded-[8px] transition-all cursor-pointer"
                      aria-label="Next year"
                    >
                      {pickerYear + 1} ›
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-0.5">
                    {MONTH_NAMES.map((monthName, idx) => {
                      const isSelected = pickerYear === viewYear && idx === viewMonth;
                      const isCurrent = pickerYear === deviceToday.year && idx === deviceToday.month;
                      const mPrefix = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                      const mRecords = Object.values(activityLogs).filter(r => r.date.startsWith(mPrefix));
                      const mActive = mRecords.filter(r => r.type === 'active').length;
                      const mRest = mRecords.filter(r => r.type === 'rest').length;

                      return (
                        <button
                          key={`${pickerYear}-${idx}`}
                          type="button"
                          onClick={() => handleSelectMonth(pickerYear, idx)}
                          className={`w-full p-2.5 rounded-[16px] text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#5E5BAE] text-white font-bold shadow-sm' 
                              : 'bg-white/75 hover:bg-white text-[#26263F] border border-black/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[13px]">{monthName}</span>
                            {isCurrent && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-[#5E5BAE]/10 text-[#5E5BAE]'
                              }`}>
                                Current
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-[#7A7895]'}`}>
                            {mActive} active • {mRest} rest
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(monthPickerModalContent, phoneFrameRef.current);
        }
        return monthPickerModalContent;
      })()}

      {/* ============================================================ */}
      {/* Day Detail & Correction Modal (Log, Correct, or Clear Record) */}
      {/* ============================================================ */}
      {(() => {
        const currentRecord = activeDayModalDate ? activityLogs[activeDayModalDate] : null;
        let formattedDateString = '';
        let isSelectedDayToday = false;

        if (activeDayModalDate) {
          const dObj = new Date(activeDayModalDate + 'T00:00:00');
          formattedDateString = dObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          isSelectedDayToday = activeDayModalDate === deviceToday.dateStr;
        }

        const isSaveDisabled = dayDraftType === 'active' && !dayDraftTitle.trim();

        const dayModalContent = (
          <AnimatePresence>
            {activeDayModalDate && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-5 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveDayModalDate(null)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  className="relative bg-[#FAF7F2] rounded-[26px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[340px] flex flex-col gap-3.5 text-[#26263F] max-h-[88%] overflow-y-auto"
                >
                  {/* Modal Header */}
                  <div className="flex items-start justify-between pb-2 border-b border-[#26263F]/[0.06]">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-[15px] font-bold text-[#26263F]">
                          {formattedDateString}
                        </h4>
                        {isSelectedDayToday && (
                          <span className="bg-[#5E5BAE] text-white text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#7A7895] block mt-0.5">
                        {currentRecord?.isSample
                          ? 'Sample record • Demo data'
                          : currentRecord
                          ? 'Logged in local session'
                          : 'No record yet • Tap below to log'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveDayModalDate(null)}
                      className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Current Status Card */}
                  <div className={`p-3.5 rounded-[18px] border flex flex-col gap-1 ${
                    currentRecord?.type === 'active'
                      ? 'bg-[#5E5BAE]/[0.08] border-[#5E5BAE]/20 text-[#26263F]'
                      : currentRecord?.type === 'rest'
                      ? 'bg-[#E59980]/15 border-[#E59980]/30 text-[#26263F]'
                      : 'bg-black/[0.03] border-black/[0.05] text-[#7A7895]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A7895]">
                        Current Record Status
                      </span>
                      {currentRecord?.type === 'active' && (
                        <span className="text-[11px] font-bold text-[#5E5BAE]">
                          {currentRecord.durationMinutes} min active
                        </span>
                      )}
                      {currentRecord?.type === 'rest' && (
                        <span className="text-[11px] font-bold text-[#E59980]">
                          Mindful rest
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-[#26263F] mt-0.5">
                      {currentRecord?.type === 'active' && (currentRecord.title || 'Active session')}
                      {currentRecord?.type === 'rest' && (currentRecord.title || 'Mindful rest day')}
                      {(!currentRecord || currentRecord.type === 'none') && 'No activity or rest recorded for this day'}
                    </div>
                    {currentRecord?.note && (
                      <p className="text-[11.5px] text-[#5D5B78] italic mt-0.5">
                        “{currentRecord.note}”
                      </p>
                    )}
                  </div>

                  {/* Log or Correct Record (补记 / 纠正) */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#26263F]">
                      Log or Correct Record
                    </span>

                    {/* Segmented Type Selection */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/[0.04] rounded-[16px]">
                      <button
                        type="button"
                        onClick={() => {
                          setDayDraftType('active');
                          if (dayDraftType === 'rest') {
                            setDayDraftTitle('');
                            setDayDraftDuration(15);
                          }
                        }}
                        className={`py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'active'
                            ? 'bg-[#5E5BAE] text-white shadow-xs'
                            : 'text-[#7A7895] hover:text-[#26263F]'
                        }`}
                      >
                        Active
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDayDraftType('rest');
                          setDayDraftTitle('Mindful rest day');
                          setDayDraftDuration(0);
                        }}
                        className={`py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'rest'
                            ? 'bg-[#E59980] text-white shadow-xs'
                            : 'text-[#7A7895] hover:text-[#26263F]'
                        }`}
                      >
                        Rest
                      </button>

                      <button
                        type="button"
                        onClick={() => setDayDraftType('none')}
                        className={`py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'none'
                            ? 'bg-white text-[#26263F] shadow-xs'
                            : 'text-[#7A7895] hover:text-[#26263F]'
                        }`}
                      >
                        Clear
                      </button>
                    </div>

                    {/* Options for Active Movement */}
                    {dayDraftType === 'active' && (
                      <div className="flex flex-col gap-2 pt-1">
                        <span className="text-[11px] font-medium text-[#7A7895]">Quick Presets</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { title: '15-min mindful walk', dur: 15 },
                            { title: '5-min desk stretch', dur: 5 },
                            { title: '20-min nature stride', dur: 20 },
                            { title: '10-min breath reset', dur: 10 },
                          ].map((preset) => (
                            <button
                              key={preset.title}
                              type="button"
                              onClick={() => {
                                setDayDraftTitle(preset.title);
                                setDayDraftDuration(preset.dur);
                              }}
                              className={`p-2 rounded-[12px] text-left text-[11px] font-semibold border transition-all cursor-pointer ${
                                dayDraftTitle === preset.title
                                  ? 'bg-[#5E5BAE]/10 border-[#5E5BAE] text-[#5E5BAE]'
                                  : 'bg-white/70 border-black/[0.05] text-[#26263F] hover:bg-white'
                              }`}
                            >
                              <div className="truncate">{preset.title}</div>
                              <span className="text-[10px] text-[#7A7895] block mt-0.5">{preset.dur} min</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-col gap-1 mt-1">
                          <label className="text-[11px] font-medium text-[#7A7895]">Duration</label>
                          <div className="flex items-center gap-1.5">
                            {[5, 10, 15, 20, 30].map((dur) => (
                              <button
                                key={dur}
                                type="button"
                                onClick={() => setDayDraftDuration(dur)}
                                className={`flex-1 py-1 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                                  dayDraftDuration === dur
                                    ? 'bg-[#5E5BAE] text-white border-[#5E5BAE]'
                                    : 'bg-white/70 text-[#26263F] border-black/[0.05] hover:bg-white'
                                }`}
                              >
                                {dur}m
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 mt-1">
                          <label className="text-[11px] font-medium text-[#7A7895]">Activity Title</label>
                          <input
                            type="text"
                            value={dayDraftTitle}
                            onChange={(e) => setDayDraftTitle(e.target.value)}
                            placeholder="Select a preset above or type here..."
                            className="w-full px-3 py-2 rounded-[12px] bg-white border border-black/[0.08] text-xs text-[#26263F] focus:outline-none focus:ring-1 focus:ring-[#5E5BAE]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Options for Mindful Rest */}
                    {dayDraftType === 'rest' && (
                      <div className="p-3 rounded-[16px] bg-[#E59980]/15 border border-[#E59980]/30 text-[11.5px] leading-relaxed text-[#26263F]">
                        <p>
                          <strong>Rest is an active health choice.</strong> In Plan B, restorative days count toward your consistent wellbeing and prevent cumulative fatigue.
                        </p>
                      </div>
                    )}

                    {/* Note input for both active and rest */}
                    {dayDraftType !== 'none' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="text-[11px] font-medium text-[#7A7895]">Note (Optional)</label>
                        <input
                          type="text"
                          value={dayDraftNote}
                          onChange={(e) => setDayDraftNote(e.target.value)}
                          placeholder="e.g. Followed Plan B pacing calmly"
                          className="w-full px-3 py-2 rounded-[12px] bg-white border border-black/[0.08] text-xs text-[#26263F] focus:outline-none focus:ring-1 focus:ring-[#5E5BAE]"
                        />
                      </div>
                    )}
                  </div>

                  {isSaveDisabled && (
                    <p className="text-[11px] text-[#5E5BAE] font-medium text-center">
                      Select a preset or enter an activity name to save
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-black/[0.05]">
                    <button
                      type="button"
                      onClick={() => setActiveDayModalDate(null)}
                      className="flex-1 py-2.5 rounded-[14px] bg-black/5 hover:bg-black/10 text-xs font-semibold text-[#26263F] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isSaveDisabled}
                      onClick={handleSaveDayRecord}
                      className={`flex-1 py-2.5 rounded-[14px] text-xs font-semibold shadow-sm transition-colors ${
                        isSaveDisabled
                          ? 'bg-[#5E5BAE]/40 text-white/70 cursor-not-allowed'
                          : 'bg-[#5E5BAE] hover:bg-[#524FA0] text-white cursor-pointer'
                      }`}
                    >
                      {dayDraftType === 'none' ? 'Clear Record' : 'Save Record'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(dayModalContent, phoneFrameRef.current);
        }
        return dayModalContent;
      })()}

    </div>
  );
}
