import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  MessageSquare, 
  Mic, 
  Calendar, 
  Sliders, 
  Brain, 
  Compass,
  ArrowUp,
  Check,
  ChevronRight,
  X,
  Play,
  Volume2,
  Clock,
  Sparkles,
  Wifi,
  CornerDownRight
} from 'lucide-react';

const IP_IMAGE_URL = '/kila-home.png';
const NOVA_LISTENING_URL = '/kila-listening.png';
const THUMB_IMAGE_URL = '/src/assets/images/mindful_walk_thumb_1793264566501.jpg';

// Plan Information Model
interface PlanItem {
  id: string;
  title: string;
  subtitle: string;
  detailTitle: string;
  audioTitle: string;
  audioSubtitle: string;
  tip1: string;
  tip2: string;
  thumbnailUrl: string;
}

const DEFAULT_WALK_PLAN: PlanItem = {
  id: 'walk',
  title: 'Take a 15-minute walk',
  subtitle: 'After lunch could be a good time, based on your usual routine.',
  detailTitle: '15-minute Mindful Walk',
  audioTitle: 'Morning Tree Trail Audio',
  audioSubtitle: 'Gentle birdsong & calming rhythm • 15:00',
  tip1: 'Best window: right after lunch (1:15 PM) to aid light digestion and mental reset.',
  tip2: 'Zero pace requirement. Walk as slowly as you like—just let your eyes rest from screens.',
  thumbnailUrl: THUMB_IMAGE_URL
};

const STRETCH_PLAN: PlanItem = {
  id: 'stretch',
  title: '5-minute stretch at home',
  subtitle: 'Gentle body reset in your living room whenever you have a moment.',
  detailTitle: '5-minute Home Gentle Stretch',
  audioTitle: 'Living Room Calming Flow',
  audioSubtitle: 'Soft breathing cues & relaxing chime • 5:00',
  tip1: 'No mat or workout clothes required. Stand or sit comfortably near your desk or couch.',
  tip2: 'Focus on loosening tense shoulders, neck, and lower back with deep, unhurried breaths.',
  thumbnailUrl: THUMB_IMAGE_URL
};

const TOMORROW_WALK_PLAN: PlanItem = {
  id: 'tomorrow',
  title: '15-minute walk (Moved to tomorrow)',
  subtitle: 'Rescheduled for tomorrow morning. Take today to rest without guilt.',
  detailTitle: 'Rescheduled Walk for Tomorrow',
  audioTitle: 'Quiet Evening Wind-down Audio',
  audioSubtitle: 'Calm ambient tone to release the day • 10:00',
  tip1: 'Planned for tomorrow at 9:30 AM before your calendar fills up.',
  tip2: 'Today is officially a recharge window. Rest is an essential part of the journey.',
  thumbnailUrl: THUMB_IMAGE_URL
};

const REST_DAY_PLAN: PlanItem = {
  id: 'rest',
  title: 'Mindful rest day',
  subtitle: 'Activity paused for today. Give yourself permission to unwind completely.',
  detailTitle: 'Rest & Recovery Day',
  audioTitle: 'Gentle Evening Soundscape',
  audioSubtitle: 'Peaceful rain & soft piano • 20:00',
  tip1: 'Stay hydrated and give your body space to recuperate.',
  tip2: 'No checklists tonight. Nova will check back in tomorrow morning.',
  thumbnailUrl: THUMB_IMAGE_URL
};

// Chat Action Chip
interface ChatActionOption {
  label: string;
  action: 'accept' | 'show_another' | 'focus_input' | 'keep_plan';
  targetPlan?: PlanItem;
  primary?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  options?: ChatActionOption[];
  disabled?: boolean;
  selectedOptionLabel?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'Today' | 'My Plan' | 'Memory' | 'Discover'>('Today');
  
  // Current active plan & card states: 'suggested' | 'accepted' | 'completed'
  const [currentPlan, setCurrentPlan] = useState<PlanItem>(DEFAULT_WALK_PLAN);
  const [planState, setPlanState] = useState<'suggested' | 'accepted' | 'completed'>('suggested');
  
  // "Find another way" light hint for first-time users (disappears once Plan B is tapped)
  const [showPlanBHint, setShowPlanBHint] = useState<boolean>(true);

  // Hold-to-complete animation state (3 seconds = 3000ms)
  const HOLD_DURATION_MS = 3000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isAccessibleConfirmOpen, setIsAccessibleConfirmOpen] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const hasCompletedRef = useRef<boolean>(false);

  // Detail Sheet state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Chat modal overlay state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sheetInput, setSheetInput] = useState('');
  const [inputPlaceholder, setInputPlaceholder] = useState('Type your response…');
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Layout and transition geometry refs
  const phoneFrameRef = useRef<HTMLDivElement>(null);
  const homeAvatarRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>({ width: 393, height: 844 });
  const [homeAvatarRect, setHomeAvatarRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const measurePositions = useCallback(() => {
    if (homeAvatarRef.current && phoneFrameRef.current) {
      const fRect = phoneFrameRef.current.getBoundingClientRect();
      const hRect = homeAvatarRef.current.getBoundingClientRect();
      if (fRect.width > 0 && fRect.height > 0) {
        setFrameSize({ width: fRect.width, height: fRect.height });
      }
      if (hRect.width > 0 && hRect.height > 0) {
        setHomeAvatarRect({
          top: hRect.top - fRect.top,
          left: hRect.left - fRect.left,
          width: hRect.width,
          height: hRect.height,
        });
      }
    }
  }, []);

  useEffect(() => {
    measurePositions();
    const handleResize = () => measurePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measurePositions]);

  // Target coordinates for Nova docked at top edge of chat sheet
  const drawerWidth = 128;
  const drawerHeight = 128;
  const drawerLeft = (frameSize.width - drawerWidth) / 2;
  const sheetHeight = Math.min(frameSize.height * 0.74, 580);
  const sheetTop = frameSize.height - sheetHeight;
  const drawerTop = sheetTop - 64; // Nova peeks over the drawer edge by 64px (-top-16)

  // Monitor user scrolling: if user scrolls up, do not force scroll down on new messages
  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 80;
  }, []);

  // Auto-scroll chat to latest message only if user is already near bottom
  useEffect(() => {
    if (!isChatOpen) return;
    if (isNearBottomRef.current) {
      const timer = setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, isChatOpen]);

  // Adjust scroll when virtual keyboard / visualViewport shifts
  useEffect(() => {
    if (!isChatOpen || typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportChange = () => {
      if (isNearBottomRef.current) {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };
    window.visualViewport.addEventListener('resize', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
    };
  }, [isChatOpen]);

  // Push / Care message toggle
  const [showPushMessage, setShowPushMessage] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const handleToggleNotification = () => {
    setShowPushMessage((prev) => !prev);
    setHasUnreadNotification(false);
  };

  // 1. Initial State Handlers
  // "Sounds good" directly accepts current recommendation into "YOUR PLAN"
  const handleSoundsGood = () => {
    hasCompletedRef.current = false;
    isHoldingRef.current = false;
    setPlanState('accepted');
    setHoldProgress(0);
  };

  // Click "Plan B" on initial suggestion: Opens chat with proactive alternative
  const handleInitialPlanB = () => {
    setShowPlanBHint(false);
    setInputPlaceholder('Tell Nova what changed…');
    isNearBottomRef.current = true;
    setChatMessages([
      {
        id: 'msg-init-alt',
        sender: 'ai',
        text: 'How about a 5-minute stretch at home instead?',
        options: [
          {
            label: 'Sounds good',
            action: 'accept',
            targetPlan: STRETCH_PLAN
          },
          {
            label: 'Show me another option',
            action: 'show_another'
          },
          {
            label: 'Tell Nova what changed',
            action: 'focus_input'
          }
        ]
      }
    ]);
    setIsChatOpen(true);
  };

  // 2. Accepted State Handlers
  // Click "Plan B" on already accepted plan: Proactively offers alternative while keeping current plan until accepted
  const handleAcceptedPlanB = () => {
    setInputPlaceholder('Tell Nova what changed…');
    isNearBottomRef.current = true;
    const alternative = currentPlan.id === 'walk' ? STRETCH_PLAN : TOMORROW_WALK_PLAN;
    const alternativeText = currentPlan.id === 'walk'
      ? 'How about a 5-minute stretch at home instead?'
      : 'Would moving your walk to tomorrow work better?';

    setChatMessages([
      {
        id: 'msg-accepted-alt',
        sender: 'ai',
        text: alternativeText,
        options: [
          {
            label: 'Sounds good',
            action: 'accept',
            targetPlan: alternative
          },
          {
            label: 'Show me another option',
            action: 'show_another'
          },
          {
            label: 'Tell Nova what changed',
            action: 'focus_input'
          }
        ]
      }
    ]);
    setIsChatOpen(true);
  };

  // "Not today" on accepted plan: opens dialogue without auto-modifying or canceling
  const handleNotToday = () => {
    setInputPlaceholder('Tell Nova what changed…');
    isNearBottomRef.current = true;
    setChatMessages([
      {
        id: 'msg-not-today',
        sender: 'ai',
        text: 'Totally fine! Rest days are just as healthy. Shall we take today off and reset tomorrow?',
        options: [
          {
            label: 'Sounds good (Take today off)',
            action: 'accept',
            targetPlan: REST_DAY_PLAN
          },
          {
            label: 'Keep plan for now',
            action: 'keep_plan'
          },
          {
            label: 'Tell Nova what changed',
            action: 'focus_input'
          }
        ]
      }
    ]);
    setIsChatOpen(true);
  };

  // 3. Option Action Handler inside chat
  const handleOptionClick = (option: ChatActionOption, messageId?: string) => {
    isNearBottomRef.current = true;
    if (option.action === 'accept' && option.targetPlan) {
      // User accepts alternative: update plan in background, switch to accepted state, keep drawer open
      hasCompletedRef.current = false;
      isHoldingRef.current = false;
      setCurrentPlan(option.targetPlan);
      setPlanState('accepted');
      setHoldProgress(0);

      // Determine Nova confirmation copy matching the accepted alternative
      let replyText = 'Sounds good. I’ve added the 5-minute stretch to your plan.';
      if (option.targetPlan.id === 'tomorrow' || option.targetPlan.id === 'tomorrow_walk') {
        replyText = 'Sounds good. I’ve moved your walk to tomorrow.';
      } else if (option.targetPlan.id === 'rest') {
        replyText = 'Sounds good. I’ve updated today to a rest day.';
      } else if (option.targetPlan.id === 'stretch') {
        replyText = 'Sounds good. I’ve added the 5-minute stretch to your plan.';
      } else {
        replyText = `Sounds good. I’ve updated your plan to ${option.targetPlan.title.toLowerCase()}.`;
      }

      const now = Date.now();
      setChatMessages((prev) => [
        ...prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : { ...m, disabled: true }
        ),
        {
          id: `usr-${now}`,
          sender: 'user',
          text: 'Sounds good.'
        },
        {
          id: `ai-${now + 1}`,
          sender: 'ai',
          text: replyText
        }
      ]);
      // Chat drawer remains OPEN so user can continue chatting; no setIsChatOpen(false)
    } else if (option.action === 'show_another') {
      // Show next alternative option: disable prior cards, record user's choice
      setChatMessages((prev) => {
        const disabledPrev = prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : { ...m, disabled: true }
        );
        const hasTomorrowWalk = prev.some((m) =>
          m.options?.some((o) => o.targetPlan?.id === 'tomorrow' || o.targetPlan?.id === 'tomorrow_walk')
        );

        const nextAiMsg: ChatMessage = !hasTomorrowWalk
          ? {
              id: `ai-${Date.now() + 1}`,
              sender: 'ai',
              text: 'Would moving your walk to tomorrow work better?',
              options: [
                {
                  label: 'Sounds good',
                  action: 'accept',
                  targetPlan: TOMORROW_WALK_PLAN
                },
                {
                  label: 'Show me another option',
                  action: 'show_another'
                },
                {
                  label: 'Tell Nova what changed',
                  action: 'focus_input'
                }
              ]
            }
          : {
              id: `ai-${Date.now() + 1}`,
              sender: 'ai',
              text: 'How about taking today as a gentle rest day? No pressure at all—we can reset tomorrow.',
              options: [
                {
                  label: 'Sounds good (Take today off)',
                  action: 'accept',
                  targetPlan: REST_DAY_PLAN
                },
                {
                  label: 'Tell Nova what changed',
                  action: 'focus_input'
                }
              ]
            };

        return [
          ...disabledPrev,
          {
            id: `usr-${Date.now()}`,
            sender: 'user',
            text: 'Show me another option'
          },
          nextAiMsg
        ];
      });
    } else if (option.action === 'focus_input') {
      // Keep conversation open, disable option card, Nova replies with pure prompt, focus input
      setInputPlaceholder('Tell Nova what changed…');
      isNearBottomRef.current = true;
      const now = Date.now();
      setChatMessages((prev) => [
        ...prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : { ...m, disabled: true }
        ),
        {
          id: `usr-${now}`,
          sender: 'user',
          text: 'Tell Nova what changed'
        },
        {
          id: `ai-${now + 1}`,
          sender: 'ai',
          text: 'Of course. What changed for you today?'
        }
      ]);
      setTimeout(() => {
        chatInputRef.current?.focus();
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 120);
    } else if (option.action === 'keep_plan') {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : m
        )
      );
      setIsChatOpen(false);
    }
  };

  // 4. Send freeform chat message
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetInput.trim()) return;
    const text = sheetInput.trim();
    setSheetInput('');
    isNearBottomRef.current = true;

    setChatMessages((prev) => [
      ...prev.map((m) => ({ ...m, disabled: true })),
      {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text
      },
      {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: "Got it! Listening to your body is what matters most. How about a 5-minute breather or taking today off?",
        options: [
          {
            label: 'Sounds good (5-min stretch)',
            action: 'accept',
            targetPlan: STRETCH_PLAN
          },
          {
            label: 'Take today off',
            action: 'accept',
            targetPlan: REST_DAY_PLAN
          },
          {
            label: 'Keep current plan',
            action: 'keep_plan'
          }
        ]
      }
    ]);
  };

  // Hold-to-complete logic (3 seconds = 3000ms)
  const cancelHold = useCallback(() => {
    if (planState === 'completed' || hasCompletedRef.current) return;
    if (holdTimerRef.current) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isHoldingRef.current = false;
    setIsHolding(false);
    setHoldProgress(0);
    holdStartRef.current = 0;
  }, [planState]);

  const startHold = useCallback((e?: React.SyntheticEvent | Event) => {
    if (planState === 'completed') return;
    // Only accept primary mouse click (button === 0) if mouse event
    if (e && 'button' in e && (e as React.MouseEvent).button !== 0) return;

    if (holdTimerRef.current) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    isHoldingRef.current = true;
    hasCompletedRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);
    holdStartRef.current = performance.now();

    const update = () => {
      if (!isHoldingRef.current) return;
      const elapsed = performance.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        // Successfully held for the full 3 seconds
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          isHoldingRef.current = false;
          setIsHolding(false);
          setHoldProgress(100);
          setPlanState('completed');
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(50); } catch (_) {}
          }
        }
      } else {
        holdTimerRef.current = requestAnimationFrame(update);
      }
    };

    holdTimerRef.current = requestAnimationFrame(update);
  }, [planState]);

  // Handle touch moving outside button boundary (finger slide out)
  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!isHoldingRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isInside =
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom;
    if (!isInside) {
      cancelHold();
    }
  };

  // Keyboard accessibility: Enter or Space activates confirmation dialog
  const handleDoneKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (planState === 'completed') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cancelHold();
      setIsAccessibleConfirmOpen(true);
    }
  };

  // Screen reader / assistive technology click: detail === 0
  const handleDoneClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Assistive technology (screen reader) or keyboard synthesized click
    if (e.detail === 0 && planState !== 'completed' && !hasCompletedRef.current) {
      cancelHold();
      setIsAccessibleConfirmOpen(true);
      return;
    }
    // Standard mouse click or touch tap: do nothing;
    // cancelHold() already reset progress to 0 on release.
  };

  // Global listeners when user is actively holding: mouseup, touchend, blur, window visibility
  useEffect(() => {
    if (!isHolding) return;

    const handleWindowBlur = () => cancelHold();
    const handleVisibility = () => {
      if (document.hidden) cancelHold();
    };
    const handleGlobalMouseUp = () => cancelHold();
    const handleGlobalTouchEnd = () => cancelHold();

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [isHolding, cancelHold]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
    };
  }, []);

  // Handle push message action
  const handleTellPlanB = () => {
    setChatMessages([
      {
        id: 'msg-push',
        sender: 'user',
        text: "About yesterday's walk..."
      },
      {
        id: 'ai-push',
        sender: 'ai',
        text: "I'm listening! Did you get a chance to step outside, or did life get in the way?",
        options: [
          {
            label: 'Did 5-minute stretch instead',
            action: 'accept',
            targetPlan: STRETCH_PLAN
          },
          {
            label: 'Life got busy, took rest',
            action: 'accept',
            targetPlan: REST_DAY_PLAN
          },
          {
            label: 'Tell Nova what changed',
            action: 'focus_input'
          }
        ]
      }
    ]);
    setIsChatOpen(true);
  };

  // SVG circular progress calculation (enlarged by ~1.4x, radius 34)
  const circleRadius = 34;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (holdProgress / 100) * circumference;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAE6F4] via-[#EDE9F6] to-[#E5E0F2] flex items-center justify-center p-0 sm:py-6 font-sans antialiased select-none text-[#26263F]">
      {/* 393 × 852 px Native Smartphone Frame */}
      <div 
        ref={phoneFrameRef}
        className="w-full max-w-[393px] h-[100dvh] sm:h-[844px] sm:max-h-[852px] bg-[#FAF8F5] relative flex flex-col justify-between overflow-hidden sm:rounded-[44px] sm:shadow-[0_28px_72px_-16px_rgba(90,80,140,0.18)] sm:border sm:border-white/80"
      >
        
        {/* Soft Ambient Light Glows (Low-saturation, ethereal warmth & lavender mist as in reference) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0">
          {/* Subtle peach / apricot gentle warmth in upper-right */}
          <div className="absolute -top-12 -right-16 w-80 h-80 rounded-full bg-radial from-[#FCEEE5]/65 via-[#FAF3ED]/30 to-transparent blur-3xl" />
          {/* Delicate celestial lavender / lilac glow in center */}
          <div className="absolute top-48 -left-20 w-80 h-80 rounded-full bg-radial from-[#EEE9FC]/70 via-[#F4F1FD]/35 to-transparent blur-3xl" />
          {/* Soft serene sky mist near bottom */}
          <div className="absolute -bottom-16 right-0 w-80 h-72 rounded-full bg-radial from-[#EBF2FD]/55 via-[#F3EEFD]/30 to-transparent blur-3xl" />
          {/* Central diffused light aura behind companion & card */}
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-radial from-white/60 via-white/20 to-transparent blur-2xl" />
        </div>

        {/* Unified Animated Nova Companion (Seamlessly transitions between Home & Drawer top edge) */}
        <motion.div
          className="absolute pointer-events-none select-none z-50 flex items-center justify-center"
          initial={false}
          animate={{
            top: isChatOpen ? drawerTop : (homeAvatarRect?.top ?? 145),
            left: isChatOpen ? drawerLeft : (homeAvatarRect?.left ?? ((frameSize.width - 204) / 2)),
            width: isChatOpen ? 128 : (homeAvatarRect?.width ?? 204),
            height: isChatOpen ? 128 : (homeAvatarRect?.height ?? 204),
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.05 }
              : {
                  duration: isChatOpen ? 0.44 : 0.38,
                  ease: isChatOpen ? [0.32, 0.72, 0, 1] : [0.25, 1, 0.5, 1],
                }
          }
        >
          {/* Soft lilac & warm cream halo behind character (fades out as Nova descends to drawer) */}
          <motion.div 
            animate={{ opacity: isChatOpen ? 0 : 0.85, scale: isChatOpen ? 0.6 : 1 }}
            transition={{ duration: isChatOpen ? 0.25 : 0.35 }}
            className="absolute inset-1 rounded-full bg-radial from-[#F3EEFE]/80 via-[#FDF3ED]/35 to-transparent blur-2xl pointer-events-none -z-10" 
          />

          {/* Home Nova image (smoothly crossfades out as it approaches drawer rim) */}
          <motion.img
            src={IP_IMAGE_URL}
            alt="Plan B Companion Nova"
            referrerPolicy="no-referrer"
            animate={{ opacity: isChatOpen ? 0 : 1 }}
            transition={{ 
              duration: shouldReduceMotion ? 0.05 : (isChatOpen ? 0.22 : 0.26),
              delay: shouldReduceMotion ? 0 : (isChatOpen ? 0.14 : 0)
            }}
            className="w-full h-full object-contain pointer-events-none drop-shadow-xs [mask-image:linear-gradient(to_bottom,black_86%,transparent_100%)] absolute inset-0"
          />

          {/* Listening Nova image (smoothly crossfades in as it arrives at drawer rim) */}
          <motion.img
            src={NOVA_LISTENING_URL}
            alt="Nova listening"
            referrerPolicy="no-referrer"
            animate={{ opacity: isChatOpen ? 1 : 0 }}
            transition={{ 
              duration: shouldReduceMotion ? 0.05 : (isChatOpen ? 0.26 : 0.2),
              delay: shouldReduceMotion ? 0 : (isChatOpen ? 0.16 : 0)
            }}
            className="w-full h-full object-contain pointer-events-none drop-shadow-xs absolute inset-0"
          />
        </motion.div>

        {/* 1. iOS Status Bar (44px Height Standard Safe Area) */}
        <div className="pt-3.5 pb-1 px-7 flex items-center justify-between text-xs font-semibold text-[#26263F] select-none shrink-0 z-30">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            {/* Cellular signal bars */}
            <svg className="w-4 h-3 fill-current" viewBox="0 0 17 12">
              <rect x="0" y="9" width="2.5" height="3" rx="0.5" />
              <rect x="4" y="6" width="2.5" height="6" rx="0.5" />
              <rect x="8" y="3" width="2.5" height="9" rx="0.5" />
              <rect x="12" y="0" width="2.5" height="12" rx="0.5" />
            </svg>
            <Wifi className="w-3.5 h-3.5 stroke-[2.4]" />
            {/* Battery icon */}
            <div className="w-5 h-2.5 border border-[#26263F] rounded-[3px] p-0.5 flex items-center">
              <div className="w-full h-full bg-[#26263F] rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* 2. Top Header Bar (24px horizontal padding) */}
        <header className="px-6 pt-1 pb-1.5 flex items-center justify-between shrink-0 z-20">
          <span className="text-[24px] font-bold tracking-tight text-[#26263F]">
            Plan B
          </span>
          <button 
            type="button"
            onClick={handleToggleNotification}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#26263F] bg-white/50 hover:bg-white/80 border border-white/75 backdrop-blur-md active:scale-95 transition-all shadow-[0_2px_8px_rgba(94,91,174,0.06)]"
            aria-label="Messages"
            title={showPushMessage ? "Switch to daily care" : "View push message"}
          >
            <MessageSquare className="w-5 h-5 stroke-[2]" />
            {hasUnreadNotification && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#FF7A32] ring-2 ring-white" />
            )}
          </button>
        </header>

        {/* 3. Main Body Content: Balanced vertical layout with 24px margins */}
        <div 
          onScroll={measurePositions}
          className="flex-1 overflow-y-auto px-6 pt-1 pb-3 flex flex-col items-center justify-center scrollbar-none z-10"
        >
          <div className="w-full flex flex-col items-center my-auto py-1">
            
            {/* Unified Companion Section: IP + Nickname + Speech */}
            <div className="w-full flex flex-col items-center justify-center shrink-0 mb-5 sm:mb-6">
              {/* Centered IP Character Bust spacer (holds geometry in document flow) */}
              <div 
                ref={homeAvatarRef}
                className="relative w-[196px] h-[196px] sm:w-[208px] sm:h-[208px] flex items-center justify-center pointer-events-none shrink-0"
              />

              {/* 1. Centered Nickname "Nova": 8-12px below visible Avatar */}
              <h2 className="text-[18px] font-bold text-[#26263F] tracking-tight text-center mt-2.5 select-none leading-none">
                Nova
              </h2>

              {/* 2. Lightweight Speech Area: 16-20px below "Nova" */}
              <div className="mt-3.5 sm:mt-4 text-center px-4 transition-all duration-300">
                {!showPushMessage ? (
                  <p className="text-[14px] font-normal text-[#5D5B78] leading-snug tracking-normal animate-in fade-in duration-300">
                    Hope your morning is going a little easier.
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-1 animate-in fade-in duration-300">
                    <p className="text-[14px] font-normal text-[#26263F] leading-snug">
                      Did you get a chance to take that walk yesterday?
                    </p>
                    <button
                      type="button"
                      onClick={handleTellPlanB}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#5E5BAE] hover:text-[#4B4897] active:scale-95 transition-all underline underline-offset-3 mt-0.5"
                    >
                      <span>Tell Plan B</span>
                      <ChevronRight className="w-3 h-3 stroke-[2.4]" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Plan Card: 28px corner radius with delicate frosted glass texture */}
            <div 
              className={`w-full rounded-[28px] p-6 transition-all duration-300 ease-out shrink-0 relative overflow-hidden backdrop-blur-xl ${
                planState === 'suggested'
                  ? 'bg-white/75 border border-white/85 shadow-[0_8px_32px_-8px_rgba(110,100,165,0.08),0_1px_1px_rgba(255,255,255,0.95)_inset]'
                  : 'bg-white/80 border border-white/90 shadow-[0_10px_36px_-8px_rgba(94,91,174,0.10),0_1px_1px_rgba(255,255,255,0.95)_inset]'
              }`}
            >
              {/* Subtle top edge frosted light reflection inside the card */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

              {/* CARD STATE 1: SUGGESTED (Initial Single AI Recommendation) */}
              {planState === 'suggested' && (
                <div className="flex flex-col justify-between gap-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6865B8] block">
                      Today’s suggestion
                    </span>
                    <h2 className="text-[20px] sm:text-[21px] font-bold tracking-tight text-[#26263F] mt-1.5 leading-snug">
                      {currentPlan.title}
                    </h2>
                    <p className="text-[14px] text-[#5D5B78] mt-1.5 leading-relaxed">
                      {currentPlan.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSoundsGood}
                      className="h-12 px-4 rounded-[18px] bg-[#5E5BAE] hover:bg-[#524FA0] active:bg-[#484591] active:scale-[0.98] text-white text-[14px] font-bold shadow-[0_4px_16px_rgba(94,91,174,0.22)] border border-white/20 transition-all flex items-center justify-center text-center min-h-[44px]"
                    >
                      Sounds good
                    </button>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={handleInitialPlanB}
                        className="h-12 w-full px-4 rounded-[18px] bg-white/70 hover:bg-white/90 active:scale-[0.98] text-[#46437B] border border-white/90 shadow-[0_2px_10px_rgba(94,91,174,0.05)] text-[14px] font-semibold transition-all flex items-center justify-center text-center min-h-[44px] backdrop-blur-md"
                      >
                        Plan B
                      </button>
                      {/* Light explanatory hint for first-time users */}
                      {showPlanBHint && (
                        <span className="text-[11px] text-[#706E8A] text-center mt-1.5 select-none animate-in fade-in font-normal tracking-tight">
                          Find another way
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CARD STATE 2 & 3: ACCEPTED (YOUR PLAN) & COMPLETED */}
              {planState !== 'suggested' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  
                  {/* 1. Top Section: Label "YOUR PLAN", Plan Title Left, Thumbnail Right */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6865B8] block mb-1">
                      YOUR PLAN
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[20px] sm:text-[21px] font-bold tracking-tight text-[#26263F] leading-snug truncate">
                        {currentPlan.title}
                      </h2>

                      {/* Rich Media Thumbnail Entry */}
                      <button
                        type="button"
                        onClick={() => setIsDetailOpen(true)}
                        className="relative w-12 h-12 rounded-[16px] overflow-hidden shrink-0 border border-white/80 shadow-[0_2px_8px_rgba(38,38,63,0.06)] group active:scale-95 transition-all"
                        title="View plan guide"
                      >
                        <img
                          src={currentPlan.thumbnailUrl}
                          alt="Plan preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-white/95 flex items-center justify-center shadow-xs">
                            <Play className="w-2.5 h-2.5 fill-[#26263F] text-[#26263F] ml-0.5" />
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 2. Middle Section: Horizontally Centered Circular Done Button (1.4x) + "Hold to complete" */}
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="relative w-[76px] h-[76px] flex items-center justify-center">
                      {/* SVG Progress Ring */}
                      <svg className="w-[76px] h-[76px] -rotate-90 pointer-events-none" viewBox="0 0 76 76">
                        <circle
                          cx="38"
                          cy="38"
                          r={circleRadius}
                          className="stroke-[#EAE7F6]/80"
                          strokeWidth="4"
                          fill="transparent"
                        />
                        <circle
                          cx="38"
                          cy="38"
                          r={circleRadius}
                          className={`stroke-[#FF7A32] ${isHolding ? 'transition-none' : 'transition-all duration-150'}`}
                          strokeWidth="4.5"
                          strokeDasharray={circumference}
                          strokeDashoffset={planState === 'completed' ? 0 : strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>

                      {/* Circular Button Core (60px diameter, min 44px target) */}
                      <button
                        type="button"
                        onMouseDown={startHold}
                        onMouseUp={cancelHold}
                        onMouseLeave={cancelHold}
                        onTouchStart={startHold}
                        onTouchEnd={cancelHold}
                        onTouchCancel={cancelHold}
                        onTouchMove={handleTouchMove}
                        onContextMenu={(e) => e.preventDefault()}
                        onKeyDown={handleDoneKeyDown}
                        onClick={handleDoneClick}
                        aria-label={planState === 'completed' ? 'Plan completed' : 'Press and hold for 3 seconds to complete, or press Enter for confirmation dialog'}
                        className={`absolute w-[60px] h-[60px] rounded-full flex items-center justify-center font-bold transition-all duration-200 select-none shadow-sm touch-none border border-white/20 ${
                          planState === 'completed'
                            ? 'bg-[#54519E] text-white shadow-[0_4px_16px_rgba(84,81,158,0.25)]'
                            : isHolding
                            ? 'bg-[#484591] text-white scale-95 shadow-inner'
                            : 'bg-[#5E5BAE] hover:bg-[#524FA0] active:bg-[#484591] text-white shadow-[0_4px_18px_rgba(94,91,174,0.28)]'
                        }`}
                      >
                        {planState === 'completed' ? (
                          <Check className="w-6 h-6 stroke-[3] text-white" />
                        ) : (
                          <span className="font-bold text-[16px] tracking-tight text-white">Done</span>
                        )}
                      </button>
                    </div>

                    <span className="text-[12px] mt-2 whitespace-nowrap text-center font-normal">
                      {planState === 'completed' ? (
                        <span className="text-[#5E5BAE] font-semibold">Completed</span>
                      ) : (
                        <span className="text-[#706E8A]">Hold to complete</span>
                      )}
                    </span>
                  </div>

                  {/* 3. Bottom Section: Side-by-Side "Plan B" and "Not today" */}
                  <div className="flex items-center justify-center gap-7 pt-2.5 border-t border-[#26263F]/[0.06]">
                    {planState === 'completed' ? (
                      <button
                        type="button"
                        onClick={() => {
                          hasCompletedRef.current = false;
                          isHoldingRef.current = false;
                          setPlanState('accepted');
                          setHoldProgress(0);
                        }}
                        className="text-xs font-semibold text-[#46437B] hover:text-[#26263F] py-2 px-3 transition-colors whitespace-nowrap underline underline-offset-3 cursor-pointer min-h-[44px] flex items-center"
                      >
                        Undo completion
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleAcceptedPlanB}
                          className="text-xs font-semibold text-[#46437B] hover:text-[#26263F] py-2 px-3 rounded-full hover:bg-white/50 transition-colors whitespace-nowrap cursor-pointer active:scale-95 min-h-[44px] flex items-center"
                        >
                          Plan B
                        </button>
                        <button
                          type="button"
                          onClick={handleNotToday}
                          className="text-xs font-semibold text-[#46437B] hover:text-[#26263F] py-2 px-3 rounded-full hover:bg-white/50 transition-colors whitespace-nowrap cursor-pointer active:scale-95 min-h-[44px] flex items-center"
                        >
                          Not today
                        </button>
                      </>
                    )}
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>

        {/* 4. Bottom Pinned Section: Conversational Input & 4 Navigation Tabs */}
        <div className="px-6 pt-2 pb-1.5 flex flex-col gap-1.5 shrink-0 z-20 bg-white/60 backdrop-blur-xl border-t border-white/65 shadow-[0_-4px_24px_rgba(90,80,140,0.04)]">
          {/* Conversational Input Entry */}
          <button 
            type="button"
            onClick={() => {
              setInputPlaceholder('Type your response…');
              setChatMessages([
                {
                  id: 'msg-open-input',
                  sender: 'ai',
                  text: "Hi! How's your day shaping up? Tell me whatever is on your mind."
                }
              ]);
              setIsChatOpen(true);
            }}
            className="w-full bg-white/70 hover:bg-white/85 backdrop-blur-md rounded-full px-5 py-3 flex items-center gap-3 border border-white/80 shadow-[0_2px_12px_rgba(90,80,140,0.04)] cursor-pointer min-h-[48px] transition-all text-left"
            aria-label="Talk to Nova"
          >
            <span className="flex-1 text-[13.5px] text-[#7A7895] font-normal select-none">
              Talk to Nova…
            </span>
            <div className="text-[#6865B8]">
              <Mic className="w-5 h-5 stroke-[2]" />
            </div>
          </button>

          {/* 4 Bottom Navigation Tabs */}
          <nav className="pt-1 px-1 flex items-center justify-between text-xs font-medium">
            {[
              { id: 'Today', icon: Calendar },
              { id: 'My Plan', icon: Sliders },
              { id: 'Memory', icon: Brain },
              { id: 'Discover', icon: Compass },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[16px] transition-all min-h-[44px] justify-center ${
                    isActive
                      ? 'bg-white/80 backdrop-blur-sm text-[#5E5BAE] shadow-2xs border border-white/80 font-bold'
                      : 'text-[#7A7895] hover:text-[#26263F]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  <span className="text-[11px] tracking-tight">{tab.id}</span>
                </button>
              );
            })}
          </nav>

          {/* 5. iOS Home Gesture Indicator Bar (34px Height Safe Area) */}
          <div className="pt-1 pb-1.5 flex items-center justify-center select-none shrink-0">
            <div className="w-32 h-1 bg-[#26263F]/20 rounded-full" />
          </div>
        </div>

        {/* 6. Rich Media Plan Detail Sheet */}
        {isDetailOpen && (
          <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
            <div className="bg-[#FAF8FD]/92 backdrop-blur-2xl rounded-t-[34px] border-t border-white/80 shadow-[0_-16px_48px_rgba(90,80,140,0.12)] flex flex-col h-[75%] max-h-[580px] animate-in slide-in-from-bottom duration-300">
              
              {/* Sheet Header */}
              <div className="px-6 pt-5 pb-3.5 border-b border-[#26263F]/[0.06] flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6865B8]">
                    Plan Details
                  </span>
                  <h3 className="text-base font-bold text-[#26263F] mt-0.5">{currentPlan.detailTitle}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#706E8A] bg-white/60 hover:bg-white/90 border border-white/70 shadow-2xs active:scale-95 transition-all"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>

              {/* Sheet Content: Media & Action Guide */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Media Hero Banner */}
                <div className="relative w-full h-36 rounded-[22px] overflow-hidden border border-white/80 shadow-xs">
                  <img
                    src={currentPlan.thumbnailUrl}
                    alt={currentPlan.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4">
                    <div className="flex items-center justify-between w-full text-white">
                      <div>
                        <div className="text-xs font-bold">{currentPlan.audioTitle}</div>
                        <div className="text-[10.5px] text-white/85">{currentPlan.audioSubtitle}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        className="w-9 h-9 rounded-full bg-[#5E5BAE] hover:bg-[#524FA0] text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform"
                      >
                        {isPlayingAudio ? (
                          <Volume2 className="w-4 h-4 stroke-[2.4] text-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clean Practical Tips */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[#26263F]">Gentle Guidelines</h4>
                  <div className="p-3.5 rounded-[20px] bg-white/75 backdrop-blur-md border border-white/80 text-xs text-[#5D5B78] space-y-2.5 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-[#6865B8] mt-0.5 shrink-0 stroke-[2]" />
                      <span>{currentPlan.tip1}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-[#FF7A32] mt-0.5 shrink-0 stroke-[2]" />
                      <span>{currentPlan.tip2}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sheet Bottom Safe Area & Action */}
              <div className="p-5 pb-6 border-t border-[#26263F]/[0.06] bg-[#FAF8FD]/90 backdrop-blur-md flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="w-full py-3 rounded-[18px] bg-white/75 hover:bg-white/90 border border-white/90 text-[#46437B] text-xs font-semibold text-center active:scale-98 transition-all min-h-[44px] shadow-2xs backdrop-blur-md"
                >
                  Back to Today
                </button>
                <div className="w-32 h-1 bg-[#26263F]/20 rounded-full mx-auto" />
              </div>

            </div>
          </div>
        )}

        {/* 7. AI Conversation Drawer / Sheet with smooth entrance and exit */}
        <AnimatePresence>
          {isChatOpen && (
            <div className="absolute inset-0 z-40 overflow-hidden flex flex-col justify-end pointer-events-auto">
              {/* Dimmed Backdrop */}
              <motion.div 
                onClick={() => setIsChatOpen(false)} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.05 } : { duration: 0.38, ease: "easeInOut" }}
                className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" 
              />

              {/* Drawer Sheet */}
              <motion.div 
                initial={shouldReduceMotion ? { y: 0, opacity: 0 } : { y: '100%' }}
                animate={shouldReduceMotion ? { y: 0, opacity: 1 } : { y: 0 }}
                exit={shouldReduceMotion ? { y: 0, opacity: 0 } : { y: '100%' }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.05 }
                    : {
                        duration: 0.42,
                        ease: [0.32, 0.72, 0, 1],
                      }
                }
                className="relative bg-[#FAF8FD]/94 backdrop-blur-2xl rounded-t-[36px] border-t border-white/85 shadow-[0_-16px_48px_rgba(90,80,140,0.14)] flex flex-col h-[74%] max-h-[580px] z-10"
              >
                {/* Close Button Top-Right (Independent of Nova) */}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="absolute top-3.5 right-4 z-40 w-9 h-9 rounded-full flex items-center justify-center text-[#706E8A] bg-white/60 hover:bg-white/90 border border-white/70 shadow-2xs active:scale-95 transition-all"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* Header with Centered Nickname "Nova" */}
                <div className="pt-14 pb-2 px-5 border-b border-[#26263F]/[0.05] flex items-center justify-center shrink-0">
                  <h3 className="text-[16px] font-bold text-[#26263F] tracking-tight text-center">
                    Nova
                  </h3>
                </div>

                {/* Animated Inner Content (Header, Messages, Input) */}
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.05 }
                      : {
                          delay: 0.16,
                          duration: 0.26,
                          ease: "easeOut",
                        }
                  }
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Chat Messages Body */}
                  <div 
                    ref={chatContainerRef}
                    onScroll={handleChatScroll}
                    className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3.5 text-xs leading-relaxed"
                  >
                    {chatMessages.map((msg) => {
                      // If AI message has options, render as a genuine frosted chat bubble
                      if (msg.sender === 'ai' && msg.options && msg.options.length > 0) {
                        return (
                          <div
                            key={msg.id}
                            className="flex flex-col items-start transition-opacity duration-200"
                          >
                            <div className="max-w-[85%] bg-white/85 backdrop-blur-md rounded-[22px] rounded-bl-xs border border-white/90 p-4 shadow-[0_2px_12px_rgba(90,80,140,0.04)] space-y-2.5">
                              {/* Suggestion Text */}
                              <p className="text-[13.5px] leading-relaxed text-[#26263F]">
                                {msg.text}
                              </p>

                              {/* Action Options: If active (not disabled), show all selectable options */}
                              {!msg.disabled && (
                                <div className="flex flex-col items-start gap-2 pt-1">
                                  {msg.options.map((opt, optIdx) => (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      onClick={() => handleOptionClick(opt, msg.id)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[18px] border border-white/90 bg-[#F4F1FD]/85 hover:bg-[#ECE7FB] active:scale-[0.98] text-[#46437B] text-xs font-semibold text-left transition-all select-none min-h-[38px] shadow-2xs cursor-pointer"
                                    >
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* If handled/disabled message: unselected operations are collapsed.
                                  Only the chosen option (if any) is shown as a subtle, non-clickable status chip. */}
                              {msg.disabled && msg.selectedOptionLabel && (
                                <div className="pt-0.5">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] border border-[#5E5BAE]/20 bg-[#EBE7FA]/80 text-[11.5px] font-medium text-[#46437B] select-none cursor-default">
                                    <Check className="w-3 h-3 stroke-[2.5] text-[#5E5BAE]" />
                                    <span>{msg.selectedOptionLabel}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Standard chat bubble (e.g. user messages or regular AI text)
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] px-4 py-2.5 rounded-[20px] ${
                              msg.sender === 'user'
                                ? 'bg-[#5E5BAE] text-white rounded-br-xs shadow-[0_3px_12px_rgba(94,91,174,0.2)] font-medium'
                                : 'bg-white/85 backdrop-blur-md text-[#26263F] border border-white/90 rounded-bl-xs shadow-2xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Chat Input Bar inside sheet with Home Indicator safe area */}
                  <form
                    onSubmit={handleSendChatMessage}
                    className="p-4 pb-6 border-t border-[#26263F]/[0.05] bg-[#FAF8FD]/95 backdrop-blur-md shrink-0 flex flex-col gap-2"
                  >
                    <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2.5 flex items-center gap-2 border border-white/85 shadow-2xs focus-within:border-[#5E5BAE]/60 focus-within:ring-2 focus-within:ring-[#5E5BAE]/15 transition-all">
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={sheetInput}
                        onChange={(e) => setSheetInput(e.target.value)}
                        onFocus={() => {
                          isNearBottomRef.current = true;
                          setTimeout(() => {
                            chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                          }, 150);
                        }}
                        placeholder={inputPlaceholder}
                        className="flex-1 bg-transparent text-xs text-[#26263F] placeholder-[#8E8EA8] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!sheetInput.trim()}
                        aria-label="Send message"
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          sheetInput.trim()
                            ? 'bg-[#5E5BAE] hover:bg-[#524FA0] text-white active:scale-95 shadow-2xs'
                            : 'bg-[#EDEAF4] text-[#A2A0B8]'
                        }`}
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="w-32 h-1 bg-[#26263F]/20 rounded-full mx-auto" />
                  </form>
                </motion.div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 7. Accessible Confirmation Dialog (Keyboard & Screen Reader Users) */}
        {isAccessibleConfirmOpen && (
          <div 
            className="absolute inset-0 z-50 bg-black/25 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accessible-dialog-title"
          >
            <div className="bg-[#FAF8FD]/95 backdrop-blur-2xl border border-white/90 rounded-[24px] p-6 w-full max-w-[310px] shadow-[0_16px_48px_rgba(90,80,140,0.18)] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5">
              <div>
                <h3 id="accessible-dialog-title" className="text-base font-bold text-[#26263F]">
                  Mark plan as complete?
                </h3>
                <p className="text-xs text-[#5D5B78] mt-1.5 leading-relaxed">
                  Confirm that you’ve completed <span className="font-semibold text-[#26263F]">“{currentPlan.title}”</span> for today.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccessibleConfirmOpen(false)}
                  className="px-3.5 py-2 rounded-[16px] bg-white/70 hover:bg-white/90 border border-white/85 text-xs font-semibold text-[#46437B] active:scale-95 transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hasCompletedRef.current = true;
                    isHoldingRef.current = false;
                    setIsAccessibleConfirmOpen(false);
                    setPlanState('completed');
                    setHoldProgress(100);
                  }}
                  className="px-4 py-2 rounded-[16px] bg-[#5E5BAE] hover:bg-[#524FA0] active:bg-[#484591] text-white text-xs font-bold shadow-[0_4px_14px_rgba(94,91,174,0.22)] active:scale-95 transition-all min-h-[44px]"
                >
                  Confirm Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
