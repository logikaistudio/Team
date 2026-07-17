import React, { useState, useEffect } from 'react';
import { Plus, FolderPlus, Play, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Diamond, Settings, Calendar, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { GanttChart, WBSNode, Task, Dependency } from '../components/GanttChart';
import clsx from 'clsx';
import { request } from '../services/api';

const initialData: WBSNode[] = [];
const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const WBSPage: React.FC = () => {
  const [nodes, setNodes] = useState<WBSNode[]>(initialData);
  const [projects, setProjects] = useState<{ id: string; name: string; startDate?: Date; endDate?: Date; progressPercent?: number }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; startDate?: Date; endDate?: Date; progressPercent?: number } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'n1': true,
    'n2': true,
    'n3': true,
  });
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Modals state
  const [isNodeModalOpen, setNodeModalOpen] = useState(false);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // Edit State
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // WBS Settings state
  const [rescheduleMode, setRescheduleMode] = useState<'start' | 'end' | 'duration'>('start');
  const [newProjectStart, setNewProjectStart] = useState<string>('');
  const [newProjectEnd, setNewProjectEnd] = useState<string>('');

  // Form state
  const [newNode, setNewNode] = useState({ code: '', name: '', weight: 0 });
  
  const [newTask, setNewTask] = useState({ 
    nodeId: '', name: '', start: '', end: '', cost: 0, status: 'not_started' as Task['status'], resources: '', isMilestone: false, depTaskId: '', depType: 'FS' as Dependency['type']
  });

  const [editTaskForm, setEditTaskForm] = useState<{
     name: string; start: string; end: string; cost: number; progress: number; status: Task['status']; resources: string; dependencies: Dependency[];
  } | null>(null);

  const [newDep, setNewDep] = useState({ taskId: '', type: 'FS' as Dependency['type'] });

  // Scroll synchronization refs
  const leftPaneRef = React.useRef<HTMLDivElement>(null);
  const rightPaneRef = React.useRef<HTMLDivElement>(null);

  const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rightPaneRef.current && rightPaneRef.current.scrollTop !== e.currentTarget.scrollTop) {
      rightPaneRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (leftPaneRef.current && leftPaneRef.current.scrollTop !== e.currentTarget.scrollTop) {
      leftPaneRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  useEffect(() => {
    if (editingTask) {
      setEditTaskForm({
        name: editingTask.name,
        start: editingTask.start,
        end: editingTask.end,
        cost: editingTask.cost,
        progress: editingTask.progress,
        status: editingTask.status,
        resources: editingTask.resources ? editingTask.resources.join(', ') : '',
        dependencies: editingTask.dependencies ? [...editingTask.dependencies] : []
      });
      setNewDep({ taskId: '', type: 'FS' });
    } else {
      setEditTaskForm(null);
    }
  }, [editingTask]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await request<{ id: string; name: string; startDate?: Date; endDate?: Date; progressPercent?: number }[]>('/projects');
        setProjects(data);
        if (data.length) {
          setSelectedProjectId(data[0].id);
          setSelectedProject(data[0]);
          // Initialize reschedule inputs with current project dates
          if (data[0].startDate) setNewProjectStart(new Date(data[0].startDate).toISOString().split('T')[0]);
          if (data[0].endDate) setNewProjectEnd(new Date(data[0].endDate).toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);
    if (project) {
      setSelectedProject(project);
      if (project.startDate) setNewProjectStart(new Date(project.startDate).toISOString().split('T')[0]);
      if (project.endDate) setNewProjectEnd(new Date(project.endDate).toISOString().split('T')[0]);
    }
    const loadWBS = async () => {
      try {
        const data = await request<WBSNode[]>(`/projects/${selectedProjectId}/wbs`);
        if (data && data.length) {
          // Map returned WBS nodes into expected shape
          setNodes(data.map(n => ({ ...n, tasks: [] })));
        } else {
          setNodes([]);
        }
      } catch (err) {
        console.error('Failed to load WBS', err);
      }
    };
    loadWBS();
  }, [selectedProjectId, projects]);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubTask = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const getAllTasksFlat = (tasks: Task[]): Task[] => {
    let flat: Task[] = [];
    for (const task of tasks) {
      flat.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        flat = flat.concat(getAllTasksFlat(task.subtasks));
      }
    }
    return flat;
  };

  const calculateProjectTotalDuration = (): number => {
    const allTasks = nodes.flatMap(n => n.tasks);
    const flatTasks = getAllTasksFlat(allTasks);
    const leafTasks = flatTasks.filter(t => !t.subtasks || t.subtasks.length === 0);
    
    if (leafTasks.length === 0) return 0;
    
    const starts = leafTasks.map(t => new Date(t.start)).sort((a, b) => a.getTime() - b.getTime());
    const ends = leafTasks.map(t => new Date(t.end)).sort((a, b) => b.getTime() - a.getTime());
    
    if (starts.length === 0 || ends.length === 0) return 0;
    
    const diff = Math.abs(ends[0].getTime() - starts[0].getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Get min/max dates from child tasks
  const getChildTasksDateRange = (task: Task): { start: Date | null; end: Date | null } => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return { start: new Date(task.start), end: new Date(task.end) };
    }
    
    let allChildDates: { start: Date; end: Date }[] = [];
    
    const traverseChildren = (t: Task) => {
      if (!t.subtasks || t.subtasks.length === 0) {
        allChildDates.push({ start: new Date(t.start), end: new Date(t.end) });
      } else {
        for (const child of t.subtasks) {
          traverseChildren(child);
        }
      }
    };
    
    for (const child of task.subtasks) {
      traverseChildren(child);
    }
    
    if (allChildDates.length === 0) {
      return { start: new Date(task.start), end: new Date(task.end) };
    }
    
    const starts = allChildDates.map(d => d.start).sort((a, b) => a.getTime() - b.getTime());
    const ends = allChildDates.map(d => d.end).sort((a, b) => b.getTime() - a.getTime());
    
    return { start: starts[0], end: ends[0] };
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

  const exportToExcel = () => {
    try {
      const allTasks = nodes.flatMap(n => n.tasks);
      const flatTasks = getAllTasksFlat(allTasks);
      
      // Create CSV content
      const headers = ['Task Code', 'Task Name', 'Description', 'Start Date', 'End Date', 'Duration', 'Status', 'Progress', 'Cost', 'Resources'];
      const rows = flatTasks.map(task => [
        task.id,
        task.name,
        task.description || '',
        task.start,
        task.end,
        calculateTaskDuration(task.start, task.end),
        task.status,
        task.progress,
        task.cost,
        task.resources?.join('; ') || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `WBS_${selectedProject?.name || 'Project'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Excel file exported successfully!');
    } catch (err) {
      console.error('Export to Excel failed', err);
      alert('Failed to export to Excel');
    }
  };

  const exportToPDF = () => {
    try {
      const allTasks = nodes.flatMap(n => n.tasks);
      const flatTasks = getAllTasksFlat(allTasks);
      const projectDates = getProjectDates();
      
      // Calculate min/max dates from actual tasks recursively (handling subtasks)
      let minDate = new Date();
      let maxDate = new Date();
      let hasTasks = false;

      const traverseDatesForPDF = (t: Task) => {
        hasTasks = true;
        const start = new Date(t.start);
        const end = new Date(t.end);
        if (start < minDate) minDate = start;
        if (end > maxDate) maxDate = end;
        if (t.subtasks && t.subtasks.length > 0) {
          t.subtasks.forEach(traverseDatesForPDF);
        }
      };

      nodes.forEach(node => {
        node.tasks.forEach(traverseDatesForPDF);
      });

      const getDaysBetween = (start: Date, end: Date) => {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      if (!hasTasks) {
        maxDate.setDate(maxDate.getDate() + 30);
      } else {
        // Buffer of 7 days before start and 14 days after end to keep calendar view clean
        const tempMin = new Date(minDate);
        tempMin.setDate(tempMin.getDate() - 7);
        minDate = tempMin;

        const tempMax = new Date(maxDate);
        tempMax.setDate(tempMax.getDate() + 14);
        maxDate = tempMax;
      }

      // Align to week boundaries
      const alignedStart = getIsoWeekStart(minDate);
      const alignedEnd = getIsoWeekEnd(maxDate);
      
      const MS_PER_DAY = 1000 * 60 * 60 * 24;
      const totalDays = Math.ceil((alignedEnd.getTime() - alignedStart.getTime()) / MS_PER_DAY) + 1;

      // Print page constraints: landscape A4 width is about 1050px.
      // Left columns: Task Item (~250px), Start (~75px), Finish (~75px), Duration (~60px), Weight (~50px) = 510px.
      // Remaining print space for Gantt calendar: ~540px.
      // Scale dayWidth to fit the timeline.
      const dayWidth = Math.max(6, Math.min(20, Math.floor(540 / totalDays)));
      const chartWidth = totalDays * dayWidth;

      const days = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(alignedStart);
        d.setDate(d.getDate() + i);
        return d;
      });

      // Build month segment headers
      const monthSegments = days.reduce<Array<{ label: string; span: number }>>((segments, day) => {
        const label = day.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
        const last = segments[segments.length - 1];
        if (!last || last.label !== label) {
          segments.push({ label, span: 1 });
        } else {
          last.span += 1;
        }
        return segments;
      }, []);

      // Build week segment headers
      const getWeekNumber = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / MS_PER_DAY) + 1) / 7);
        return weekNo;
      };

      const weekSegments: Array<{ label: string; span: number }> = [];
      let i = 0;
      while (i < days.length) {
        const start = days[i];
        const isoDay = start.getDay() === 0 ? 7 : start.getDay();
        const span = Math.min(7 - isoDay + 1, days.length - i);
        weekSegments.push({ label: `W${getWeekNumber(start)}`, span });
        i += span;
      }

      // Render hierarchical print table rows
      const renderPrintRows = (): string => {
        let rows = '';
        
        // Pre-compute task positions for SVG dependency lines in PDF
        const pdfTaskPositions: Record<string, { leftX: number; rightX: number; centerY: number }> = {};
        let currentY = 0; 
        
        const computePositions = (tasks: Task[], depth: number = 0) => {
          tasks.forEach(task => {
            let displayStart = task.start;
            let displayEnd = task.end;
            const isParent = task.subtasks && task.subtasks.length > 0;
            if (isParent) {
              const childDates = getChildTasksDateRange(task);
              if (childDates.start && childDates.end) {
                displayStart = childDates.start.toISOString().split('T')[0];
                displayEnd = childDates.end.toISOString().split('T')[0];
              }
            }
            const taskStart = new Date(displayStart);
            const taskEnd = task.isMilestone ? taskStart : new Date(displayEnd);
            const offsetDays = getDaysBetween(alignedStart, taskStart);
            const durationDays = task.isMilestone ? 0 : getDaysBetween(taskStart, taskEnd) + 1;
            
            const leftX = offsetDays * dayWidth;
            const rightX = leftX + (task.isMilestone ? 8 : Math.max(8, durationDays * dayWidth));
            const centerY = currentY + 10; // 10 is half of 20px task row height
            
            pdfTaskPositions[task.id] = { leftX, rightX, centerY };
            currentY += 20;
            
            if (task.subtasks && task.subtasks.length > 0) {
              computePositions(task.subtasks, depth + 1);
            }
          });
        };

        nodes.forEach(node => {
          currentY += 22; // node row height
          computePositions(node.tasks);
        });

        const renderTask = (task: Task, depth: number = 0): string => {
          let taskRows = '';
          const indent = `indent-${Math.min(depth + 1, 4)}`; // tasks are indented under nodes
          const isParent = task.subtasks && task.subtasks.length > 0;
          const parentClass = isParent ? 'task-parent' : '';

          let displayStart = task.start;
          let displayEnd = task.end;
          let displayDuration = calculateTaskDuration(task.start, task.end);
          let displayWeight = (typeof (task as any).weight === 'number') ? (task as any).weight : '-';

          if (isParent) {
            const childDates = getChildTasksDateRange(task);
            if (childDates.start && childDates.end) {
              displayStart = childDates.start.toISOString().split('T')[0];
              displayEnd = childDates.end.toISOString().split('T')[0];
              displayDuration = calculateTaskDuration(displayStart, displayEnd);
            }
          }

          // Calculate task bar bounds
          const taskStart = new Date(displayStart);
          const taskEnd = task.isMilestone ? taskStart : new Date(displayEnd);
          
          const offsetDays = getDaysBetween(alignedStart, taskStart);
          const durationDays = task.isMilestone ? 0 : getDaysBetween(taskStart, taskEnd) + 1;

          const left = offsetDays * dayWidth;
          const width = task.isMilestone ? 8 : Math.max(8, durationDays * dayWidth);

          // Generate SVG dependencies targeting this task
          let depsSvg = '';
          if (task.dependencies && task.dependencies.length > 0) {
            const targetPos = pdfTaskPositions[task.id];
            if (targetPos) {
              task.dependencies.forEach(dep => {
                const sourcePos = pdfTaskPositions[dep.taskId];
                if (sourcePos) {
                  let startX = 0, endX = 0;
                  if (dep.type === 'FS') { startX = sourcePos.rightX; endX = targetPos.leftX; }
                  else if (dep.type === 'FF') { startX = sourcePos.rightX; endX = targetPos.rightX; }
                  else if (dep.type === 'SS') { startX = sourcePos.leftX; endX = targetPos.leftX; }
                  else if (dep.type === 'SF') { startX = sourcePos.leftX; endX = targetPos.rightX; }
                  
                  // The container is centered at Y=10 for this row. Start Y is relative to this row's center.
                  const startY = sourcePos.centerY - targetPos.centerY + 10;
                  const endY = 10;
                  const pathD = `M ${startX} ${startY} L ${startX + Math.min(20, dayWidth*2)} ${startY} L ${startX + Math.min(20, dayWidth*2)} ${endY} L ${endX} ${endY}`;
                  
                  depsSvg += `<path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-opacity="0.6" marker-end="url(#arrowhead)"></path>`;
                }
              });
            }
          }

          taskRows += `
            <tr class="${parentClass}" style="height: 20px;">
              <td class="${indent}" style="border: 1px solid #111; padding: 4px 6px;">${task.isMilestone ? '⬥ ' : ''}${task.name}</td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">${displayStart}</td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">${displayEnd}</td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">${task.isMilestone ? 'MS' : displayDuration + 'd'}</td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">${displayWeight}</td>
              <td style="border: 1px solid #111; padding: 0; position: relative; width: ${chartWidth}px; min-width: ${chartWidth}px; max-width: ${chartWidth}px; height: 20px; vertical-align: middle; overflow: visible;">
                 <!-- Background day grid lines for this row -->
                 <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; pointer-events: none; z-index: 1;">
                    ${days.map(() => `<div style="width: ${dayWidth}px; min-width: ${dayWidth}px; border-right: 1px solid #e5e7eb; height: 100%; box-sizing: border-box; flex-shrink: 0;"></div>`).join('')}
                 </div>
                 
                 <!-- Predecessor Lines -->
                 ${depsSvg ? `
                   <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none;">
                     <svg width="100%" height="100%" style="overflow: visible;">
                       <defs>
                          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" fillOpacity="0.6" />
                          </marker>
                       </defs>
                       ${depsSvg}
                     </svg>
                   </div>
                 ` : ''}

                 <!-- Task bar: Colorful reference bar + progress overlay -->
                 ${task.isMilestone ?
                   `<div style="position: absolute; top: 50%; left: ${left + 1}px; transform: translateY(-50%) rotate(45deg); width: 8px; height: 8px; background: #d97706; border: 1.5px solid #92400e; box-sizing: border-box; z-index: 4;"></div>` :
                   `<!-- Colored reference bar (full planned duration) -->
                    <div style="position: absolute; top: 50%; left: ${left}px; transform: translateY(-50%); width: ${width}px; height: 10px; background: ${isParent ? '#4b5563' : '#2563eb'}; border-radius: 2px; border: 1px solid rgba(0,0,0,0.15); box-sizing: border-box; z-index: 4;"></div>
                    <!-- Semi-transparent overlay on the right to show remaining work -->
                    <div style="position: absolute; top: 50%; left: ${left + Math.round(width * Math.min(100, Math.max(0, Number(task.progress) || 0)) / 100)}px; transform: translateY(-50%); width: ${width - Math.round(width * Math.min(100, Math.max(0, Number(task.progress) || 0)) / 100)}px; height: 10px; background: rgba(255,255,255,0.55); border-radius: 0 2px 2px 0; box-sizing: border-box; z-index: 5;"></div>`
                 }
              </td>
            </tr>
          `;


          if (task.subtasks && task.subtasks.length > 0) {
            taskRows += task.subtasks.map(sub => renderTask(sub, depth + 1)).join('');
          }

          return taskRows;
        };

        for (const node of nodes) {
          const nodeDateRange = getNodeDateRange(node.tasks);
          
          // Compute node bar bounds from its task date range
          let nodeBarLeft = 0;
          let nodeBarWidth = 0;
          if (nodeDateRange.start && nodeDateRange.end) {
            const nodeDayOffset = Math.ceil((nodeDateRange.start.getTime() - alignedStart.getTime()) / MS_PER_DAY);
            const nodeDurationDays = Math.ceil((nodeDateRange.end.getTime() - nodeDateRange.start.getTime()) / MS_PER_DAY) + 1;
            nodeBarLeft = Math.max(0, nodeDayOffset) * dayWidth;
            nodeBarWidth = Math.max(8, nodeDurationDays * dayWidth);
          }

          // Render Node Row Header (clean transparent bg, only lines)
          rows += `
            <tr class="node-row" style="height: 22px; font-weight: bold;">
              <td class="indent-0" style="border: 1px solid #111; padding: 4px 6px;">
                <span style="color: #4b5563; margin-right: 4px;">${node.code}</span> ${node.name}
              </td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">
                ${nodeDateRange.start ? nodeDateRange.start.toISOString().split('T')[0] : '—'}
              </td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">
                ${nodeDateRange.end ? nodeDateRange.end.toISOString().split('T')[0] : '—'}
              </td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">
                ${nodeDateRange.duration}d
              </td>
              <td style="border: 1px solid #111; padding: 4px 6px; text-align: center;">
                ${node.weight}%
              </td>
              <td style="border: 1px solid #111; padding: 0; position: relative; width: ${chartWidth}px; min-width: ${chartWidth}px; max-width: ${chartWidth}px; height: 22px; vertical-align: middle; overflow: hidden;">
                 <!-- Background day grid lines for this row -->
                 <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; pointer-events: none; z-index: 1;">
                    ${days.map(() => `<div style="width: ${dayWidth}px; min-width: ${dayWidth}px; border-right: 1px solid #e5e7eb; height: 100%; box-sizing: border-box; flex-shrink: 0;"></div>`).join('')}
                 </div>
                 <!-- Node summary bar: Colorful reference bar + progress overlay -->
                 ${nodeBarWidth > 0 ? `
                   <!-- Colored summary bar (full node planned duration) -->
                   <div style="position: absolute; top: 50%; left: ${nodeBarLeft}px; transform: translateY(-50%); width: ${nodeBarWidth}px; height: 12px; background: #374151; border-radius: 2px; border: 1px solid rgba(0,0,0,0.2); box-sizing: border-box; z-index: 2;"></div>
                   <!-- Semi-transparent overlay on the right to show remaining work -->
                   <div style="position: absolute; top: 50%; left: ${nodeBarLeft + Math.round(nodeBarWidth * Math.min(100, Math.max(0, Number((node as any).progressPercent) || 0)) / 100)}px; transform: translateY(-50%); width: ${nodeBarWidth - Math.round(nodeBarWidth * Math.min(100, Math.max(0, Number((node as any).progressPercent) || 0)) / 100)}px; height: 12px; background: rgba(255,255,255,0.55); border-radius: 0 2px 2px 0; box-sizing: border-box; z-index: 3;"></div>
                 ` : ''}
              </td>
            </tr>

          `;

          // Render tasks under this node
          rows += node.tasks.map(task => renderTask(task, 0)).join('');
        }
        
        return rows;
      };

      // Create HTML content for PDF in landscape
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>WBS Report - ${selectedProject?.name || 'Project'}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #000; background-color: #fff; }
              .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #111; padding-bottom: 8px; }
              .header h1 { margin: 0; font-size: 20px; color: #000; }
              .header p { margin: 4px 0; color: #444; font-size: 11px; }
              
              .summary-section { margin-bottom: 15px; }
              .summary-title { font-weight: bold; font-size: 12px; color: #000; margin-bottom: 6px; }
              .summary-grid { display: flex; gap: 10px; margin-bottom: 15px; }
              .summary-item { flex: 1; border: 1px solid #111; padding: 6px 8px; background: transparent; }
              .summary-label { font-size: 9px; color: #444; font-weight: bold; }
              .summary-value { font-size: 11px; color: #000; margin-top: 2px; font-weight: bold; }
              
              .table-container { width: 100%; overflow-x: visible; }
              
              /* Print table styling - simple lines only, no dark fills */
              table.print-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                page-break-inside: auto;
              }
              table.print-table tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              table.print-table th {
                border: 1px solid #111;
                font-weight: bold;
                text-align: left;
                background-color: transparent;
                color: #000;
                padding: 6px 8px;
              }
              table.print-table td {
                border: 1px solid #111;
                padding: 4px 6px;
                background-color: transparent;
                color: #000;
              }
              
              .indent-0 { padding-left: 6px !important; font-weight: bold; }
              .indent-1 { padding-left: 20px !important; }
              .indent-2 { padding-left: 35px !important; }
              .indent-3 { padding-left: 50px !important; }
              .indent-4 { padding-left: 65px !important; }
              
              .task-parent { font-weight: bold; }
              .task-milestone { font-weight: bold; }
              
              .footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #111; text-align: right; font-size: 9px; color: #666; }
            </style>
          </head>
          <body>
            <!-- Header -->
            <div class="header">
              <h1>Work Breakdown Structure (WBS) Report</h1>
              <p><strong>${selectedProject?.name || 'Project'}</strong></p>
              <p>Generated on ${new Date().toLocaleString('id-ID')}</p>
            </div>
            
            <!-- Project Summary -->
            <div class="summary-section">
              <div class="summary-title">Project Summary</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Project Start</div>
                  <div class="summary-value">${projectDates.start?.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Project End</div>
                  <div class="summary-value">${projectDates.end?.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Duration</div>
                  <div class="summary-value">${calculateProjectTotalDuration()} days</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Tasks</div>
                  <div class="summary-value">${flatTasks.length}</div>
                </div>
              </div>
            </div>
            
            <!-- Unified WBS & Timeline Table -->
            <div class="table-container">
              <table class="print-table">
                <thead>
                  <tr>
                    <th rowspan="3" style="width: 328px; min-width: 328px; max-width: 328px; border: 1px solid #111;">Task Item</th>
                    <th rowspan="3" style="width: 52px; min-width: 52px; max-width: 52px; border: 1px solid #111; text-align: center;">Start</th>
                    <th rowspan="3" style="width: 52px; min-width: 52px; max-width: 52px; border: 1px solid #111; text-align: center;">Finish</th>
                    <th rowspan="3" style="width: 38px; min-width: 38px; max-width: 38px; border: 1px solid #111; text-align: center;">Duration</th>
                    <th rowspan="3" style="width: 35px; min-width: 35px; max-width: 35px; border: 1px solid #111; text-align: center;">Weight</th>
                    <th style="padding: 0; border: 1px solid #111; height: 24px; border-bottom: 1px solid #111;">
                      <div style="display: flex; width: ${chartWidth}px;">
                        ${monthSegments.map(s => `<div style="width: ${s.span * dayWidth}px; text-align: center; border-right: 1px solid #111; box-sizing: border-box; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 4px 0; font-size: 10px; font-weight: bold;">${s.label}</div>`).join('')}
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <th style="padding: 0; border: 1px solid #111; height: 18px; border-bottom: 1px solid #111;">
                      <div style="display: flex; width: ${chartWidth}px;">
                        ${weekSegments.map(s => `<div style="width: ${s.span * dayWidth}px; text-align: center; border-right: 1px solid #111; box-sizing: border-box; overflow: hidden; white-space: nowrap; padding: 2px 0; font-size: 8px;">${s.label}</div>`).join('')}
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <th style="padding: 0; border: 1px solid #111; height: 16px;">
                      <div style="display: flex; width: ${chartWidth}px;">
                        ${days.map(d => {
                          const showText = dayWidth >= 12;
                          return `<div style="width: ${dayWidth}px; text-align: center; border-right: 1px solid #eee; box-sizing: border-box; padding: 1px 0; font-size: 7px;">${showText ? d.getDate() : ''}</div>`;
                        }).join('')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${renderPrintRows()}
                </tbody>
              </table>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>Page generated by EPCS (Enterprise Project Control System)</p>
            </div>
          </body>
        </html>
      `;
      
      // Open in new window and print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Trigger print dialog with landscape orientation
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (err) {
      console.error('Export to PDF failed', err);
      alert('Failed to export to PDF');
    }
  };

  const calculateProjectDuration = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProjectDates = () => {
    if (!selectedProject) return { start: null, end: null, duration: 0 };
    const start = selectedProject.startDate ? new Date(selectedProject.startDate) : null;
    const end = selectedProject.endDate ? new Date(selectedProject.endDate) : null;
    const duration = start && end ? calculateProjectDuration(start.toISOString().split('T')[0], end.toISOString().split('T')[0]) : 0;
    return { start, end, duration };
  };

  const rescheduleAllTasks = async () => {
    if (!selectedProjectId) {
      alert('No project selected');
      return;
    }

    try {
      const allTasks = nodes.flatMap(n => n.tasks);
      if (allTasks.length === 0) {
        alert('No tasks to reschedule');
        return;
      }

      let updatedTasks: Task[] = [];

      if (rescheduleMode === 'start') {
        // Reschedule based on new start date
        if (!newProjectStart) {
          alert('Please enter a new start date');
          return;
        }
        const oldStart = selectedProject?.startDate ? new Date(selectedProject.startDate) : null;
        if (!oldStart) {
          alert('Current project start date not available');
          return;
        }

        const newStart = new Date(newProjectStart);
        const daysDiff = Math.floor((newStart.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24));

        updatedTasks = allTasks.map(task => ({
          ...task,
          start: new Date(new Date(task.start).getTime() + daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date(new Date(task.end).getTime() + daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
      } else if (rescheduleMode === 'end') {
        // Reschedule based on new end date
        if (!newProjectEnd) {
          alert('Please enter a new end date');
          return;
        }
        const oldEnd = selectedProject?.endDate ? new Date(selectedProject.endDate) : null;
        if (!oldEnd) {
          alert('Current project end date not available');
          return;
        }

        const newEnd = new Date(newProjectEnd);
        const daysDiff = Math.floor((newEnd.getTime() - oldEnd.getTime()) / (1000 * 60 * 60 * 24));

        updatedTasks = allTasks.map(task => ({
          ...task,
          start: new Date(new Date(task.start).getTime() + daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date(new Date(task.end).getTime() + daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
      } else if (rescheduleMode === 'duration') {
        // Compress or expand tasks based on new duration
        if (!newProjectStart || !newProjectEnd) {
          alert('Please enter both new start and end dates');
          return;
        }
        const newDuration = calculateProjectDuration(newProjectStart, newProjectEnd);
        const currentDates = getProjectDates();
        if (currentDates.duration === 0) {
          alert('Cannot calculate current project duration');
          return;
        }

        const scaleFactor = newDuration / currentDates.duration;
        const oldStart = selectedProject?.startDate ? new Date(selectedProject.startDate) : new Date(allTasks[0]?.start || '2026-01-01');

        updatedTasks = allTasks.map(task => {
          const taskStartDiff = Math.floor((new Date(task.start).getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24));
          const taskEndDiff = Math.floor((new Date(task.end).getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24));
          const newTaskStart = new Date(newProjectStart).getTime() + taskStartDiff * scaleFactor * 24 * 60 * 60 * 1000;
          const newTaskEnd = new Date(newProjectStart).getTime() + taskEndDiff * scaleFactor * 24 * 60 * 60 * 1000;

          return {
            ...task,
            start: new Date(newTaskStart).toISOString().split('T')[0],
            end: new Date(newTaskEnd).toISOString().split('T')[0]
          };
        });
      }

      // Update all tasks
      for (const task of updatedTasks) {
        const payload = {
          name: task.name,
          plannedStart: task.start,
          plannedEnd: task.end,
          plannedCost: task.cost,
          progressPercent: task.progress,
          status: task.status,
          resources: task.resources,
          dependencies: task.dependencies
        };

        try {
          await request<Task>(`/projects/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } catch (err) {
          console.error(`Failed to update task ${task.id}:`, err);
        }
      }

      // Update local state
      setNodes(nodes.map(n => ({
        ...n,
        tasks: n.tasks.map(t => updatedTasks.find(ut => ut.id === t.id) || t)
      })));

      alert('All tasks rescheduled successfully!');
      setSettingsModalOpen(false);
    } catch (err) {
      console.error('Reschedule failed', err);
      alert('Failed to reschedule tasks');
    }
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        if (!selectedProjectId) throw new Error('No project selected');
        const payload = { projectId: selectedProjectId, parentId: null, code: newNode.code, name: newNode.name, description: '', weight: Number(newNode.weight) };
        if (editingNodeId) {
          const updated = await request<WBSNode>(`/projects/wbs/${editingNodeId}`, { method: 'PUT', body: JSON.stringify(payload) });
          setNodes(prev => prev.map(n => n.id === updated.id ? { ...updated, tasks: n.tasks } : n));
        } else {
          const created = await request<WBSNode>('/projects/wbs', { method: 'POST', body: JSON.stringify(payload) });
          setNodes(prev => [...prev, { ...created, tasks: [] }]);
          setExpandedNodes(prev => ({ ...prev, [created.id]: true }));
        }
        setNodeModalOpen(false);
        setNewNode({ code: '', name: '', weight: 0 });
        setEditingNodeId(null);
      } catch (err) {
        console.error('Create WBS failed', err);
        alert('Failed to create/update WBS node');
      }
    })();
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const deps: Dependency[] = [];
    if (newTask.depTaskId) {
      deps.push({ taskId: newTask.depTaskId, type: newTask.depType });
    }
    const taskObj: Task = {
      id: `t${Date.now()}`,
      name: newTask.name,
      start: newTask.start,
      end: newTask.isMilestone ? newTask.start : newTask.end,
      cost: Number(newTask.cost),
      progress: 0,
      status: newTask.status,
      resources: newTask.resources.split(',').map(r => r.trim()).filter(r => r),
      isMilestone: newTask.isMilestone,
      dependencies: deps.length > 0 ? deps : undefined
    };

    setNodes(nodes.map(n => n.id === newTask.nodeId ? { ...n, tasks: [...n.tasks, taskObj] } : n));
    setTaskModalOpen(false);
    setNewTask({ nodeId: '', name: '', start: '', end: '', cost: 0, status: 'not_started', resources: '', isMilestone: false, depTaskId: '', depType: 'FS' });
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskForm) return;
    try {
      const payload = {
        name: editTaskForm.name,
        plannedStart: editTaskForm.start,
        plannedEnd: editingTask.isMilestone ? editTaskForm.start : editTaskForm.end,
        plannedCost: Number(editTaskForm.cost),
        progressPercent: Number(editTaskForm.progress),
        status: editTaskForm.status,
        resources: editTaskForm.resources.split(',').map(r => r.trim()).filter(r => r),
        // dependencies are sent as-is
        dependencies: editTaskForm.dependencies.length > 0 ? editTaskForm.dependencies : undefined
      } as any;

      if (!isUuid(editingTask.id)) {
        setNodes(nodes.map(n => ({
          ...n,
          tasks: n.tasks.map(t => t.id === editingTask.id ? { ...t, ...payload } as Task : t)
        })));
        setEditingTask(null);
        return;
      }

      const updated = await request<Task>(`/projects/tasks/${editingTask.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setNodes(nodes.map(n => ({ ...n, tasks: n.tasks.map(t => t.id === updated.id ? { ...t, ...updated } : t) })));
      setEditingTask(null);
    } catch (err) {
      console.error('Update task failed', err);
      alert('Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    if (!confirm('Delete this task?')) return;
    try {
      if (!isUuid(editingTask.id)) {
        setNodes(nodes.map(n => ({ ...n, tasks: n.tasks.filter(t => t.id !== editingTask.id) })));
        setEditingTask(null);
        return;
      }

      await request<void>(`/projects/tasks/${editingTask.id}`, { method: 'DELETE' });
      setNodes(nodes.map(n => ({ ...n, tasks: n.tasks.filter(t => t.id !== editingTask.id) })));
      setEditingTask(null);
    } catch (err) {
      console.error('Delete task failed', err);
      alert('Failed to delete task');
    }
  };

  const handleAddDependencyToEdit = () => {
     if (!editTaskForm || !newDep.taskId) return;
     // Prevent duplicates
     if (editTaskForm.dependencies.some(d => d.taskId === newDep.taskId)) return;
     
     setEditTaskForm({
       ...editTaskForm,
       dependencies: [...editTaskForm.dependencies, { ...newDep }]
     });
     setNewDep({ taskId: '', type: 'FS' });
  };

  const handleRemoveDependencyFromEdit = (taskId: string) => {
    if (!editTaskForm) return;
    setEditTaskForm({
      ...editTaskForm,
      dependencies: editTaskForm.dependencies.filter(d => d.taskId !== taskId)
    });
  };

  const renderTaskRow = (task: Task, depth: number = 0) => {
    const isExpanded = expandedTasks[task.id];
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    
    // Calculate dates: if parent task, get from children; otherwise use task's own dates
    let displayStart = task.start;
    let displayEnd = task.end;
    let taskDuration = calculateTaskDuration(task.start, task.end);
    
    if (hasSubtasks) {
      const childDates = getChildTasksDateRange(task);
      if (childDates.start && childDates.end) {
        displayStart = childDates.start.toISOString().split('T')[0];
        displayEnd = childDates.end.toISOString().split('T')[0];
        taskDuration = calculateTaskDuration(displayStart, displayEnd);
      }
    }
    
    return (
      <div key={task.id}>
        <div 
          onContextMenu={(e) => {
            e.preventDefault();
            if (confirm('Delete this task?')) {
              (async () => {
                try {
                  if (!isUuid(task.id)) {
                    setNodes(nodes.map(n => ({ ...n, tasks: n.tasks.filter(t => t.id !== task.id) })));
                    return;
                  }

                  await request<void>(`/projects/tasks/${task.id}`, { method: 'DELETE' });
                  setNodes(nodes.map(n => ({ ...n, tasks: n.tasks.filter(t => t.id !== task.id) })));
                } catch (err) {
                  console.error('Delete task failed', err);
                  alert('Failed to delete task');
                }
              })();
            }
          }}
          onClick={() => setEditingTask(task)}
          className="cursor-pointer h-[32px] px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors group relative overflow-hidden"
        >
          <div className="flex-1 min-w-0 flex items-center h-full">
            {/* Draw vertical tree hierarchy lines for each level of depth */}
            {Array.from({ length: depth }).map((_, i) => (
              <div key={i} className="w-5 h-full border-r border-zinc-300 dark:border-zinc-700 shrink-0"></div>
            ))}
            
            {/* Draw the L-connector for this specific task if depth > 0 */}
            {depth > 0 && (
              <div className="w-3 h-1/2 border-b border-zinc-300 dark:border-zinc-700 self-start shrink-0 mr-1"></div>
            )}
            
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {hasSubtasks && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubTask(task.id);
                  }}
                  className="shrink-0 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded z-10 relative bg-white dark:bg-[#0c0c0e]"
                >
                  {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                </button>
              )}
              {!hasSubtasks && <div className="w-[18px] shrink-0" />}
              <span className={clsx(
                "font-medium truncate block transition-colors",
                depth === 0 ? "text-sm text-zinc-900 dark:text-zinc-100" : "text-xs text-zinc-700 dark:text-zinc-300",
                task.isMilestone ? "text-yellow-600 dark:text-yellow-500" : hasSubtasks ? "font-semibold" : "group-hover:text-brand-600 dark:group-hover:text-brand-400"
              )}>
                {task.name}
              </span>
            </div>
          </div>
          <div className="w-[68px] text-center text-[11px] text-zinc-600 dark:text-zinc-400 shrink-0">
            {task.isMilestone ? '—' : new Date(displayStart).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
          </div>
          <div className="w-[68px] text-center text-[11px] text-zinc-600 dark:text-zinc-400 shrink-0">
            {task.isMilestone ? task.start.substring(5) : new Date(displayEnd).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
          </div>
          <div className="w-[45px] text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
            {task.isMilestone ? 'MS' : `${taskDuration}d`}
          </div>
          <div className="w-[35px] text-center shrink-0">
            <div className="flex items-center justify-center gap-1.5">
              {getStatusIcon(task.status, task.isMilestone)}
              {!task.isMilestone && (
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 min-w-[20px]">
                  {task.progress}%
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Render Subtasks */}
        {hasSubtasks && isExpanded && task.subtasks!.map(subtask => renderTaskRow(subtask, depth + 1))}
      </div>
    );
  };

  const getStatusIcon = (status: string, isMilestone?: boolean) => {
    if (isMilestone) return <Diamond size={14} className="text-yellow-500 fill-yellow-500" />;
    switch (status) {
      case 'completed': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'in_progress': return <Play size={14} className="text-brand-500" />;
      case 'delayed': return <AlertCircle size={14} className="text-red-500" />;
      default: return <span className="w-3.5 h-3.5 rounded-full border border-zinc-500 block" />;
    }
  };

  const calculateTaskDuration = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getNodeDateRange = (nodeTasks: Task[]) => {
    if (nodeTasks.length === 0) return { start: null, end: null, duration: 0 };
    const starts = nodeTasks.map(t => new Date(t.start)).sort((a, b) => a.getTime() - b.getTime());
    const ends = nodeTasks.map(t => new Date(t.end)).sort((a, b) => b.getTime() - a.getTime());
    const start = starts[0];
    const end = ends[0];
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { start, end, duration };
  };

  // Get all tasks for dependency selector
  const allTasks = nodes.flatMap(n => n.tasks);

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Breakdown Structure (WBS)</h1>
          <p className="text-zinc-500 text-sm">Organize scopes, view dependency networks, and track milestones.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
            title="Export as PDF"
          >
            <span>📄 PDF</span>
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors"
            title="Export as Excel"
          >
            <span>📊 Excel</span>
          </button>
          <button 
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors"
          >
            <Settings size={14} />
            <span>WBS Settings</span>
          </button>
          <button 
            onClick={() => setNodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors"
          >
            <FolderPlus size={14} />
            <span>Add Node</span>
          </button>
          <button 
            onClick={() => setTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus size={14} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Project Timeline Display */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-zinc-300">
            <Calendar size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Project Timeline</span>
          </div>
          <div className="flex gap-8 items-center">
            <div className="text-center">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Start Date</div>
              <div className="text-sm font-bold text-zinc-100">
                {selectedProject?.startDate 
                  ? new Date(selectedProject.startDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">End Date</div>
              <div className="text-sm font-bold text-zinc-100">
                {selectedProject?.endDate
                  ? new Date(selectedProject.endDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Total Duration (Tasks)</div>
              <div className="text-sm font-bold text-brand-400">
                {calculateProjectTotalDuration()} days
              </div>
            </div>
            {/* Project Progress Rollup */}
            <div className="flex flex-col items-center gap-1 min-w-[90px]">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Progress</div>
              <div className="text-lg font-bold" style={{ color: (selectedProject as any)?.progressPercent >= 100 ? '#10b981' : '#3b82f6' }}>
                {(selectedProject as any)?.progressPercent ?? 0}%
              </div>
              <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(selectedProject as any)?.progressPercent ?? 0}%`,
                    background: ((selectedProject as any)?.progressPercent ?? 0) >= 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #6366f1)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex flex-1 min-h-0 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#0c0c0e] shadow-sm">
        
        {/* Left Pane: WBS Table */}
        <div 
          ref={leftPaneRef}
          onScroll={handleLeftScroll}
          className="w-[45%] flex flex-col overflow-y-auto no-scrollbar border-r border-zinc-200 dark:border-zinc-800 z-30 bg-white dark:bg-[#0c0c0e]"
        >
          {/* Header Row */}
          <div className="sticky top-0 z-20 h-[57px] bg-white dark:bg-[#0c0c0e] border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Task Name</span>
            </div>
            <div className="w-[68px] text-center">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Start</span>
            </div>
            <div className="w-[68px] text-center">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">End</span>
            </div>
            <div className="w-[45px] text-center">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Dur</span>
            </div>
            <div className="w-[35px] text-center">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Wt</span>
            </div>
          </div>

          <div className="flex-1">
            {nodes.map((node) => {
              const isExpanded = expandedNodes[node.id];
              const nodeDateRange = getNodeDateRange(node.tasks);
              return (
                <div key={node.id} className="flex flex-col">
                  {/* Node Row */}
                  <div
                    onClick={() => toggleNode(node.id)}
                    className="h-[40px] px-4 bg-zinc-50 dark:bg-zinc-900/20 flex items-center gap-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                      <span className="text-[11px] font-bold text-zinc-400 shrink-0">{node.code}</span>
                      <span className="text-sm font-semibold truncate">{node.name}</span>
                    </div>
                    <div className="w-[68px] text-center text-[11px] text-zinc-500">
                      {nodeDateRange.start?.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) || '—'}
                    </div>
                    <div className="w-[68px] text-center text-[11px] text-zinc-500">
                      {nodeDateRange.end?.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) || '—'}
                    </div>
                    <div className="w-[45px] text-center text-[11px] font-semibold text-zinc-400">
                      {nodeDateRange.duration}d
                    </div>
                    <div className="w-[35px] text-center">
                      <div className="text-[10px] font-semibold text-zinc-500">{node.weight}%</div>
                      <div className="text-[9px] font-bold text-emerald-500">{(node as any).progressPercent ?? 0}%▶</div>
                    </div>
                  </div>

                  {/* Task Rows */}
                  {isExpanded && node.tasks.map((task) => renderTaskRow(task, 0))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Gantt Chart */}
        <GanttChart 
          nodes={nodes} 
          expandedNodes={expandedNodes} 
          expandedTasks={expandedTasks} 
          onTaskClick={setEditingTask} 
          scrollRef={rightPaneRef}
          onScroll={handleRightScroll}
        />
      </div>

      {/* Add Node Modal */}
      <Modal isOpen={isNodeModalOpen} onClose={() => setNodeModalOpen(false)} title="Add WBS Node">
        {/* Same node form */}
        <form onSubmit={handleAddNode} className="space-y-4">
          <div><label className="block text-xs font-medium text-zinc-400 mb-1">Node Code (e.g., 4.0)</label><input required value={newNode.code} onChange={e => setNewNode({...newNode, code: e.target.value})} type="text" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
          <div><label className="block text-xs font-medium text-zinc-400 mb-1">Node Name</label><input required value={newNode.name} onChange={e => setNewNode({...newNode, name: e.target.value})} type="text" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
          <div><label className="block text-xs font-medium text-zinc-400 mb-1">Weight (%)</label><input required value={newNode.weight || ''} onChange={e => setNewNode({...newNode, weight: Number(e.target.value)})} type="number" step="0.01" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
          <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors">Save Node</button>
        </form>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setTaskModalOpen(false)} title="Create New Task">
        {/* Same create task form */}
        <form onSubmit={handleAddTask} className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
          <div><label className="block text-xs font-medium text-zinc-400 mb-1">Parent Node</label><select required value={newTask.nodeId} onChange={e => setNewTask({...newTask, nodeId: e.target.value})} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"><option value="">Select a node</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.code} - {n.name}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-zinc-400 mb-1">Task Name</label><input required value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} type="text" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
          <div className="flex items-center gap-2 mt-2"><input type="checkbox" id="milestoneCb" checked={newTask.isMilestone} onChange={e => setNewTask({...newTask, isMilestone: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700" /><label htmlFor="milestoneCb" className="text-sm font-medium">Mark as Milestone</label></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-zinc-400 mb-1">Start Date</label><input required value={newTask.start} onChange={e => setNewTask({...newTask, start: e.target.value})} type="date" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
            {!newTask.isMilestone && (<div><label className="block text-xs font-medium text-zinc-400 mb-1">End Date</label><input required value={newTask.end} onChange={e => setNewTask({...newTask, end: e.target.value})} type="date" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-zinc-400 mb-1">Planned Cost ($)</label><input required value={newTask.cost || ''} onChange={e => setNewTask({...newTask, cost: Number(e.target.value)})} type="number" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
            <div><label className="block text-xs font-medium text-zinc-400 mb-1">Status</label><select required value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value as Task['status']})} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"><option value="not_started">Not Started</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option></select></div>
          </div>
          <div><label className="block text-xs font-medium text-zinc-400 mb-1">Assigned Resources</label><input value={newTask.resources} onChange={e => setNewTask({...newTask, resources: e.target.value})} placeholder="comma separated" type="text" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
            <h4 className="text-sm font-semibold mb-2">Dependencies</h4>
            <div className="grid grid-cols-3 gap-3">
               <div className="col-span-2"><label className="block text-xs font-medium text-zinc-400 mb-1">Predecessor</label><select value={newTask.depTaskId} onChange={e => setNewTask({...newTask, depTaskId: e.target.value})} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"><option value="">None</option>{allTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
               <div><label className="block text-xs font-medium text-zinc-400 mb-1">Type</label><select disabled={!newTask.depTaskId} value={newTask.depType} onChange={e => setNewTask({...newTask, depType: e.target.value as Dependency['type']})} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 disabled:opacity-50"><option value="FS">FS</option><option value="FF">FF</option><option value="SS">SS</option><option value="SF">SF</option></select></div>
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors mt-4">Save Task</button>
        </form>
      </Modal>

      {/* Edit Task Details Modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title={editingTask?.isMilestone ? "Milestone Details" : "Task Details"}>
        {editTaskForm && editingTask && (
          <form onSubmit={handleUpdateTask} className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
            <div><label className="block text-xs font-medium text-zinc-400 mb-1">Task Name</label><input required value={editTaskForm.name} onChange={e => setEditTaskForm({...editTaskForm, name: e.target.value})} type="text" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-400 mb-1">Start Date</label><input required value={editTaskForm.start} onChange={e => setEditTaskForm({...editTaskForm, start: e.target.value})} type="date" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
              {!editingTask.isMilestone && (<div><label className="block text-xs font-medium text-zinc-400 mb-1">End Date</label><input required value={editTaskForm.end} onChange={e => setEditTaskForm({...editTaskForm, end: e.target.value})} type="date" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>)}
            </div>
            
            {!editingTask.isMilestone && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 flex justify-between">
                   <span>Progress</span><span>{editTaskForm.progress}%</span>
                </label>
                <input type="range" min="0" max="100" value={editTaskForm.progress} onChange={e => setEditTaskForm({...editTaskForm, progress: Number(e.target.value)})} className="w-full accent-brand-500" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-400 mb-1">Planned Cost ($)</label><input required value={editTaskForm.cost || ''} onChange={e => setEditTaskForm({...editTaskForm, cost: Number(e.target.value)})} type="number" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
              <div><label className="block text-xs font-medium text-zinc-400 mb-1">Status</label><select required value={editTaskForm.status} onChange={e => setEditTaskForm({...editTaskForm, status: e.target.value as Task['status']})} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"><option value="not_started">Not Started</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option></select></div>
            </div>
            
            <div><label className="block text-xs font-medium text-zinc-400 mb-1">Assigned Resources</label><input value={editTaskForm.resources} onChange={e => setEditTaskForm({...editTaskForm, resources: e.target.value})} placeholder="comma separated" type="text" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" /></div>
            
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3">Dependencies</h4>
              
              {/* Existing Dependencies List */}
              {editTaskForm.dependencies.length > 0 && (
                <div className="space-y-2 mb-4">
                   {editTaskForm.dependencies.map((dep, idx) => {
                      const predecessor = allTasks.find(t => t.id === dep.taskId);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                           <div className="flex flex-col">
                              <span className="text-xs font-medium">{predecessor?.name || 'Unknown Task'}</span>
                              <span className="text-[10px] text-zinc-500">Type: {dep.type}</span>
                           </div>
                           <button type="button" onClick={() => handleRemoveDependencyFromEdit(dep.taskId)} className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded-md">
                             <Trash2 size={14} />
                           </button>
                        </div>
                      )
                   })}
                </div>
              )}

              {/* Add New Dependency Form */}
              <div className="flex gap-2 items-end bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                 <div className="flex-1">
                   <label className="block text-[10px] font-medium text-zinc-400 mb-1">Add Predecessor</label>
                   <select value={newDep.taskId} onChange={e => setNewDep({...newDep, taskId: e.target.value})} className="w-full bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                      <option value="">Select task</option>
                      {allTasks.filter(t => t.id !== editingTask.id && !editTaskForm.dependencies.some(d => d.taskId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                 </div>
                 <div className="w-20">
                   <label className="block text-[10px] font-medium text-zinc-400 mb-1">Type</label>
                   <select disabled={!newDep.taskId} value={newDep.type} onChange={e => setNewDep({...newDep, type: e.target.value as Dependency['type']})} className="w-full bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500 disabled:opacity-50">
                      <option value="FS">FS</option><option value="FF">FF</option><option value="SS">SS</option><option value="SF">SF</option>
                   </select>
                 </div>
                 <button type="button" onClick={handleAddDependencyToEdit} disabled={!newDep.taskId} className="bg-zinc-800 text-white p-1.5 rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed">
                   <Plus size={14} />
                 </button>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={handleDeleteTask} className="bg-red-600 text-white px-3 py-2 rounded-lg">Delete</button>
              <button type="button" onClick={() => setEditingTask(null)} className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium py-2 rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* WBS Settings Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="WBS Settings">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
          {/* Project Date Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Calendar size={16} />
              Project Timeline
            </h3>
            
            <div className="grid grid-cols-3 gap-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Project Start</label>
                <div className="text-sm font-semibold text-zinc-200">
                  {selectedProject?.startDate ? new Date(selectedProject.startDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Project End</label>
                <div className="text-sm font-semibold text-zinc-200">
                  {selectedProject?.endDate ? new Date(selectedProject.endDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Duration</label>
                <div className="text-sm font-semibold text-zinc-200">
                  {getProjectDates().duration} days
                </div>
              </div>
            </div>
          </div>

          {/* Reschedule Section */}
          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-semibold text-zinc-300">Reschedule All Activities</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="reschedule-mode" 
                  value="start" 
                  checked={rescheduleMode === 'start'}
                  onChange={() => setRescheduleMode('start')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                <span className="text-sm font-medium text-zinc-300">By Start Date</span>
              </label>
              {rescheduleMode === 'start' && (
                <div className="ml-7">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">New Project Start Date</label>
                  <input 
                    type="date" 
                    value={newProjectStart} 
                    onChange={(e) => setNewProjectStart(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">All activities will shift by the same number of days</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="reschedule-mode" 
                  value="end" 
                  checked={rescheduleMode === 'end'}
                  onChange={() => setRescheduleMode('end')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                <span className="text-sm font-medium text-zinc-300">By End Date</span>
              </label>
              {rescheduleMode === 'end' && (
                <div className="ml-7">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">New Project End Date</label>
                  <input 
                    type="date" 
                    value={newProjectEnd} 
                    onChange={(e) => setNewProjectEnd(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">All activities will shift backward or forward to fit the new deadline</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="reschedule-mode" 
                  value="duration" 
                  checked={rescheduleMode === 'duration'}
                  onChange={() => setRescheduleMode('duration')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                <span className="text-sm font-medium text-zinc-300">By Duration (Compress/Expand)</span>
              </label>
              {rescheduleMode === 'duration' && (
                <div className="ml-7 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">New Start Date</label>
                    <input 
                      type="date" 
                      value={newProjectStart} 
                      onChange={(e) => setNewProjectStart(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">New End Date</label>
                    <input 
                      type="date" 
                      value={newProjectEnd} 
                      onChange={(e) => setNewProjectEnd(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">Activities will be scaled proportionally to fit the new timeline</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-zinc-800">
            <button 
              type="button" 
              onClick={() => setSettingsModalOpen(false)} 
              className="flex-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={rescheduleAllTasks}
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Apply Reschedule
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
