import React, { useMemo } from 'react';
import clsx from 'clsx';

export interface Dependency {
  taskId: string;
  type: 'FS' | 'FF' | 'SS' | 'SF';
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  start: string; // YYYY-MM-DD
  end: string;
  cost: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  resources?: string[];
  isMilestone?: boolean;
  dependencies?: Dependency[];
  subtasks?: Task[];
  parentId?: string;
}

export interface WBSNode {
  id: string;
  code: string;
  name: string;
  weight: number;
  tasks: Task[];
}

interface GanttChartProps {
  nodes: WBSNode[];
  expandedNodes: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  onTaskClick?: (task: Task) => void;
  scrollRef?: React.Ref<HTMLDivElement>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const getDaysBetween = (start: Date, end: Date) => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getIsoWeekStart = (date: Date) => {
  const d = new Date(date);
  const isoDay = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (isoDay - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const getIsoWeekEnd = (date: Date) => {
  const start = getIsoWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const GanttChart: React.FC<GanttChartProps> = ({ nodes, expandedNodes, expandedTasks, onTaskClick, scrollRef, onScroll }) => {
  const { minDate, maxDate } = useMemo(() => {
    let min = new Date('2099-12-31');
    let max = new Date('1970-01-01');
    let hasTasks = false;

    const traverseDates = (t: Task) => {
      hasTasks = true;
      const start = new Date(t.start);
      const end = new Date(t.end);
      if (start < min) min = start;
      if (end > max) max = end;
      if (t.subtasks && t.subtasks.length > 0) {
        t.subtasks.forEach(traverseDates);
      }
    };

    nodes.forEach(node => {
      node.tasks.forEach(traverseDates);
    });

    if (!hasTasks) {
      min = new Date();
      max = new Date();
      max.setDate(max.getDate() + 30);
    } else {
      // Buffer of 7 days before start and 14 days after end to keep calendar view clean
      const tempMin = new Date(min);
      tempMin.setDate(tempMin.getDate() - 7);
      min = tempMin;

      const tempMax = new Date(max);
      tempMax.setDate(tempMax.getDate() + 14);
      max = tempMax;
    }

    const alignedMin = getIsoWeekStart(min);
    const alignedMax = getIsoWeekEnd(max);
    return { minDate: alignedMin, maxDate: alignedMax };
  }, [nodes]);

  const totalDays = getDaysBetween(minDate, maxDate) + 1;
  const daysArray = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Dynamic day width with a minimum limit of 28px to prevent date header overlap
  const MAX_CHART_WIDTH = 1200; // px
  const dayWidth = Math.max(28, Math.min(60, Math.floor(MAX_CHART_WIDTH / Math.max(1, totalDays))));

  // Build month and week headers
  const months = useMemo(() => {
    const map: { label: string; span: number; start: Date }[] = [];
    daysArray.forEach(d => {
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      const last = map[map.length - 1];
      if (!last || last.label !== label) {
        map.push({ label, span: 1, start: new Date(d) });
      } else {
        last.span += 1;
      }
    });
    return map;
  }, [daysArray]);

  const weeks = useMemo(() => {
    const arr: { label: string; span: number; start: Date }[] = [];
    let i = 0;
    while (i < daysArray.length) {
      const start = daysArray[i];
      const isoDay = start.getDay() === 0 ? 7 : start.getDay();
      const span = Math.min(7 - isoDay + 1, daysArray.length - i);
      arr.push({ label: `W ${getWeekNumber(start)}`, span, start: new Date(start) });
      i += span;
    }
    return arr;
  }, [daysArray]);

  // week number helper must be defined before use
  function getWeekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-brand-500';
      case 'delayed': return 'bg-red-500';
      default: return 'bg-zinc-400';
    }
  };

  const isStartOfWeek = (date: Date) => {
    const day = date.getDay();
    return day === 1;
  };

  // Calculate coordinates for all tasks (recursively mapping WBS tree)
  const { taskPositions, contentHeight } = useMemo(() => {
    let currentY = 0;
    const positions: Record<string, { leftX: number; rightX: number; centerY: number }> = {};
    
    const processTask = (task: Task) => {
      const taskStart = new Date(task.start);
      const taskEnd = task.isMilestone ? taskStart : new Date(task.end);
      
      const offsetDays = getDaysBetween(minDate, taskStart);
      const durationDays = task.isMilestone ? 0 : getDaysBetween(taskStart, taskEnd) + 1;

      const leftX = offsetDays * dayWidth;
      const rightX = leftX + (task.isMilestone ? 0 : durationDays * dayWidth);
      const centerY = currentY + (32 / 2); // middle of the 32px row
      
      positions[task.id] = { leftX, rightX, centerY };
      
      currentY += 32;

      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      if (hasSubtasks && expandedTasks[task.id]) {
        task.subtasks!.forEach(processTask);
      }
    };
    
    nodes.forEach(node => {
      // Node header row height
      currentY += 40; 
      
      if (expandedNodes[node.id]) {
        node.tasks.forEach(processTask);
      }
    });
    
    return { taskPositions: positions, contentHeight: currentY };
  }, [nodes, expandedNodes, expandedTasks, minDate, dayWidth]);

  // Generate SVG lines for dependencies recursively
  const renderDependencyLines = () => {
    const lines: JSX.Element[] = [];
    
    const processTaskDependencies = (task: Task) => {
      if (task.dependencies) {
        const targetPos = taskPositions[task.id];
        if (targetPos) {
          task.dependencies.forEach(dep => {
            const sourcePos = taskPositions[dep.taskId];
            if (!sourcePos) return;

            let startX = 0;
            let endX = 0;
            if (dep.type === 'FS') {
              startX = sourcePos.rightX;
              endX = targetPos.leftX;
            } else if (dep.type === 'FF') {
              startX = sourcePos.rightX;
              endX = targetPos.rightX;
            } else if (dep.type === 'SS') {
              startX = sourcePos.leftX;
              endX = targetPos.leftX;
            } else if (dep.type === 'SF') {
              startX = sourcePos.leftX;
              endX = targetPos.rightX;
            }

            const startY = sourcePos.centerY;
            const endY = targetPos.centerY;
            const pathD = `M ${startX} ${startY} L ${startX + Math.min(20, dayWidth*2)} ${startY} L ${startX + Math.min(20, dayWidth*2)} ${endY} L ${endX} ${endY}`;

            lines.push(
              <path
                key={`${task.id}-${dep.taskId}-${dep.type}`}
                d={pathD}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                markerEnd="url(#arrowhead)"
              />
            );
          });
        }
      }
      
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      if (hasSubtasks && expandedTasks[task.id]) {
        task.subtasks!.forEach(processTaskDependencies);
      }
    };

    nodes.forEach(node => {
      if (!expandedNodes[node.id]) return;
      node.tasks.forEach(processTaskDependencies);
    });
    return lines;
  };
  const renderGanttRows = (tasks: Task[]): JSX.Element[] => {
    const list: JSX.Element[] = [];
    tasks.forEach(task => {
      const pos = taskPositions[task.id];
      if (!pos) return;

      list.push(
        <div key={`gantt-task-${task.id}`} className="h-[32px] border-b border-zinc-200 dark:border-zinc-800 flex items-center relative hover:bg-zinc-500/5 transition-colors group">
          {task.isMilestone ? (
            // Milestone Rendering (Diamond)
            <div 
              onClick={() => onTaskClick?.(task)}
              className="absolute w-4 h-4 bg-yellow-500 transform rotate-45 shadow-sm border border-yellow-600 z-10 cursor-pointer"
              style={{ left: `${pos.leftX - 8}px` }} // center diamond
            />
          ) : (
            // Standard Task Bar
            <div
              onClick={() => onTaskClick?.(task)}
              className={clsx(
                "absolute h-6 rounded-md shadow-sm border border-black/10 dark:border-white/10 z-10 cursor-pointer",
                task.subtasks && task.subtasks.length > 0 ? "bg-zinc-600 dark:bg-zinc-400" : getStatusColor(task.status)
              )}
              style={{ left: `${pos.leftX}px`, width: `${pos.rightX - pos.leftX}px` }}
            >
               {/* Progress bar overlay for standard leaf tasks */}
               {(!task.subtasks || task.subtasks.length === 0) && (
                 <div className="absolute inset-0 bg-white/20 dark:bg-black/20 rounded-md" style={{ width: `${100 - task.progress}%`, right: 0, left: 'auto' }} />
               )}
            </div>
          )}
        </div>
      );

      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      if (hasSubtasks && expandedTasks[task.id]) {
        list.push(...renderGanttRows(task.subtasks!));
      }
    });
    return list;
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={onScroll}
      className="w-full overflow-x-auto overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 flex-1 bg-white dark:bg-[#0c0c0e] relative"
    >
      {/* Timeline Header wrapper with dynamic width to scroll in sync */}
      <div 
        className="sticky top-0 z-30 bg-white dark:bg-[#0b0b0d] border-b border-zinc-200 dark:border-zinc-800 shadow-sm print:relative print:top-auto print:z-0 print:bg-white print:border-b print:border-zinc-200"
        style={{ width: `${daysArray.length * dayWidth}px`, minWidth: '100%' }}
      >
        {/* Months row — height: 22px */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/80" style={{ height: '22px' }}>
          {months.map((m, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 border-r border-zinc-200/50 overflow-hidden"
              style={{ width: `${m.span * dayWidth}px`, height: '22px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Weeks row — height: 20px */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80" style={{ height: '20px' }}>
          {weeks.map((w, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center text-[10px] font-medium text-zinc-600 dark:text-zinc-300 border-r border-zinc-200/50 overflow-hidden"
              style={{ width: `${w.span * dayWidth}px`, height: '20px', whiteSpace: 'nowrap' }}
            >
              {w.span * dayWidth >= 24 ? w.label : ''}
            </div>
          ))}
        </div>

        {/* Days row — height: 15px */}
        <div className="flex bg-white dark:bg-[#0c0c0e]" style={{ height: '15px' }}>
          {daysArray.map((day, i) => {
            const showLabel = dayWidth >= 18;
            return (
              <div
                key={i}
                style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px`, height: '15px' }}
                className="flex-shrink-0 flex items-center justify-center text-[9px] text-zinc-500 border-r border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden"
              >
                {showLabel ? (isStartOfWeek(day) ? day.getDate() : day.getDate()) : ''}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative" style={{ height: contentHeight, width: `${daysArray.length * dayWidth}px` }}>
        {/* Background Grid Lines */}
        <div className="absolute inset-y-0 left-0 flex pointer-events-none z-0 opacity-20" style={{ width: `${daysArray.length * dayWidth}px` }}>
          {daysArray.map((_, i) => (
             <div key={i} style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px` }} className="border-r border-zinc-200 dark:border-zinc-800 h-full flex-shrink-0" />
          ))}
        </div>

        {/* SVG Dependency Lines */}
        <svg className="absolute inset-0 z-10 pointer-events-none" style={{ width: daysArray.length * dayWidth, height: contentHeight }}>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" fillOpacity="0.6" />
            </marker>
          </defs>
          {renderDependencyLines()}
        </svg>

        {/* Content Rows */}
        <div className="relative z-20 flex flex-col" style={{ width: `${daysArray.length * dayWidth}px` }}>
          {nodes.map(node => {
            const isExpanded = expandedNodes[node.id];
            return (
              <React.Fragment key={`gantt-node-${node.id}`}>
                {/* Node Row Header */}
                <div className="h-[40px] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 flex items-center relative" />

                {/* Task Rows */}
                {isExpanded && renderGanttRows(node.tasks)}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
