'use client';

import { ArrowLeft, CloudUpload, Download, Link2, Loader2, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { apiUrl, wsUrl } from '../../lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ScrollArea } from '../../components/ui/scroll-area';

type QueueManager = {
  name: string;
  state?: string;
};

type MqReportEntry = {
  name: string;
  type?: string;
};

type MqReportSection = {
  listOfObjects?: MqReportEntry[];
  count?: number;
};

type DestinationSummarySection = {
  system?: number;
  other?: number;
};

type DestinationSummaryResponse = {
  responseCode?: string;
  responseMsg?: string;
  data?: Record<
    string,
    {
      queue?: DestinationSummarySection;
      subscription?: DestinationSummarySection;
      channel?: DestinationSummarySection;
      topic?: DestinationSummarySection;
      service?: DestinationSummarySection;
      channelAuth?: DestinationSummarySection;
      listener?: DestinationSummarySection;
      nameList?: DestinationSummarySection;
    }
  >;
};

type MqReportResponse = {
  queue?: MqReportSection;
  subscription?: MqReportSection;
  channel?: MqReportSection;
  topic?: MqReportSection;
  service?: MqReportSection;
  channelAuth?: MqReportSection;
  listener?: MqReportSection;
  nameList?: MqReportSection;
};

type GuideStep = {
  title: string;
  body: string;
  examples?: string[];
  targetRef: RefObject<HTMLElement>;
};

export default function DestinationPage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected'>('untested');
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState<'success' | 'error' | ''>('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);
  const [isMigrateStreaming, setIsMigrateStreaming] = useState(false);
  const [destinationQueues, setDestinationQueues] = useState<QueueManager[]>([]);
  const [destinationSelectedQueues, setDestinationSelectedQueues] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [destinationQueuePaths, setDestinationQueuePaths] = useState<Record<string, string>>({});
  const migrateSocketRef = useRef<WebSocket | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportData, setReportData] = useState<MqReportResponse | null>(null);
  const [reportQueueName, setReportQueueName] = useState('');
  const [reportExpanded, setReportExpanded] = useState<Record<string, boolean>>({});
  const [testDone, setTestDone] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const router = useRouter();
  const destinationFormKey = 'destinationForm';
  const destinationDropdownKey = 'destinationDropdowns';
  const destinationQueuesKey = 'destinationSelectedQueues';
  const destinationConnectedKey = 'destinationConnected';
  const destinationQueuePathsKey = 'destinationQueuePaths';
  const [form, setForm] = useState({
    server: '',
    username: '',
    password: '',
    backupDir: '',
    clientId: '',
    clientSecret: '',
    tenantId: '',
    subscriptionId: '',
    resourceGroup: '',
    clusterName: '',
    namespace: '',
  });

  const [targetEnv, setTargetEnv] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('');
  const [computeModel, setComputeModel] = useState('');
  const [deploymentMode, setDeploymentMode] = useState('');
  const toastDurationMs = 3000;
  const toastFadeMs = 300;
  const clearSelectValue = '__clear__';
  const guideStorageKey = 'destinationGuideSeen';
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideRect, setGuideRect] = useState<DOMRect | null>(null);
  const [guidePlacement, setGuidePlacement] = useState<'right' | 'left' | 'top' | 'bottom'>(
    'right',
  );
  const [guideCalloutStyle, setGuideCalloutStyle] = useState<CSSProperties>({});
  const destinationFormRef = useRef<HTMLDivElement>(null);
  const connectActionRef = useRef<HTMLDivElement>(null);
  const queueManagersRef = useRef<HTMLDivElement>(null);
  const migrateActionRef = useRef<HTMLDivElement>(null);

  const platformOptions = useMemo(() => {
    if (targetEnv === 'VM') return ['Linux', 'Windows'];
    if (targetEnv === 'Host Systems') return ['Mainframe', 'AS/400', 'Windows', 'Linux'];
    if (targetEnv === 'Cloud') return ['Azure', 'AWS', 'GCP', 'IBM Cloud'];
    return [];
  }, [targetEnv]);

  const computeOptions = targetEnv === 'Cloud' && targetPlatform ? ['VM', 'Container'] : [];
  const deploymentOptions =
    computeModel === 'VM'
      ? ['RDQM', 'Multiinstance', 'Standalone']
      : computeModel === 'Container'
        ? ['Native HA', 'Multiinstance', 'Standalone']
        : [];

  const guideSteps = useMemo<GuideStep[]>(
    () => [
      {
        title: 'Requirement 1: Provide Destination connection credentials',
        body: 'Choose the target environment and platform, then enter destination credentials.',
        examples: ['mq-dr-01.company.com:1414', '/var/backups/mq-migrator/'],
        targetRef: destinationFormRef,
      },
      {
        title: 'Requirement 2: Test Connection',
        body: 'Click Connect to validate credentials and load destination queue managers.',
        targetRef: connectActionRef,
      },
      {
        title: 'Requirement 3: Select queue managers for migration',
        body: 'Pick at least one queue manager to migrate.',
        targetRef: queueManagersRef,
      },
      {
        title: 'Requirement 4: Migrate',
        body: 'Start the migration and follow the Event Logs for progress.',
        targetRef: migrateActionRef,
      },
    ],
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = sessionStorage.getItem(guideStorageKey);
    if (seen !== 'true') {
      setIsGuideOpen(true);
      setGuideStep(0);
      sessionStorage.setItem(guideStorageKey, 'true');
    }
  }, []);

  useEffect(() => {
    if (!isGuideOpen) return;
    const target = guideSteps[guideStep]?.targetRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [guideStep, guideSteps, isGuideOpen]);

  useEffect(() => {
    if (!isGuideOpen) {
      setGuideRect(null);
      return;
    }

    const updateGuide = () => {
      const target = guideSteps[guideStep]?.targetRef.current;
      if (!target) {
        setGuideRect(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setGuideRect(rect);

      const padding = 12;
      const calloutWidth = Math.min(320, window.innerWidth - padding * 2);
      const calloutHeight = 200;
      const canPlaceRight = rect.right + padding + calloutWidth < window.innerWidth;
      const canPlaceLeft = rect.left - padding - calloutWidth > 0;
      const canPlaceBottom = rect.bottom + padding + calloutHeight < window.innerHeight;

      let placement: 'right' | 'left' | 'top' | 'bottom' = 'right';
      if (canPlaceRight) placement = 'right';
      else if (canPlaceLeft) placement = 'left';
      else if (canPlaceBottom) placement = 'bottom';
      else placement = 'top';

      const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

      let top = rect.top;
      let left = rect.right + padding;

      if (placement === 'right') {
        top = clamp(rect.top, padding, window.innerHeight - calloutHeight - padding);
        left = rect.right + padding;
      } else if (placement === 'left') {
        top = clamp(rect.top, padding, window.innerHeight - calloutHeight - padding);
        left = rect.left - calloutWidth - padding;
      } else if (placement === 'bottom') {
        top = rect.bottom + padding;
        left = clamp(rect.left, padding, window.innerWidth - calloutWidth - padding);
      } else {
        top = rect.top - calloutHeight - padding;
        left = clamp(rect.left, padding, window.innerWidth - calloutWidth - padding);
      }

      setGuidePlacement(placement);
      setGuideCalloutStyle({ top, left, width: calloutWidth });
    };

    updateGuide();
    window.addEventListener('resize', updateGuide);
    window.addEventListener('scroll', updateGuide, true);
    return () => {
      window.removeEventListener('resize', updateGuide);
      window.removeEventListener('scroll', updateGuide, true);
    };
  }, [guideStep, guideSteps, isGuideOpen]);

  const startGuide = () => {
    setGuideStep(0);
    setIsGuideOpen(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(guideStorageKey, 'true');
    }
  };

  const handleGuideNext = () => {
    if (guideStep >= guideSteps.length - 1) {
      setIsGuideOpen(false);
      return;
    }
    setGuideStep((prev) => prev + 1);
  };

  const handleGuideSkip = () => {
    setIsGuideOpen(false);
  };

  const guideStepData = guideSteps[guideStep];
  const highlightPadding = 8;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const highlightStyle = guideRect
    ? {
        top: Math.max(guideRect.top - highlightPadding, highlightPadding),
        left: Math.max(guideRect.left - highlightPadding, highlightPadding),
        width: guideRect.width + highlightPadding * 2,
        height: guideRect.height + highlightPadding * 2,
      }
    : null;
  const overlayTopHeight = guideRect ? Math.max(guideRect.top - highlightPadding, 0) : 0;
  const overlayBottomTop = guideRect ? guideRect.bottom + highlightPadding : 0;
  const overlayBottomHeight = guideRect
    ? Math.max(viewportHeight - overlayBottomTop, 0)
    : 0;
  const overlaySideHeight = guideRect ? guideRect.height + highlightPadding * 2 : 0;
  const overlayLeftWidth = guideRect ? Math.max(guideRect.left - highlightPadding, 0) : 0;
  const overlayRightLeft = guideRect ? guideRect.right + highlightPadding : 0;
  const overlayRightWidth = guideRect ? Math.max(viewportWidth - overlayRightLeft, 0) : 0;

  const mqFieldsFilled =
    form.server.trim() && form.username.trim() && form.password.trim() && form.backupDir.trim();
  const cloudFieldsFilled =
    form.clientId.trim() &&
    form.clientSecret.trim() &&
    form.tenantId.trim() &&
    form.subscriptionId.trim() &&
    form.resourceGroup.trim() &&
    form.clusterName.trim() &&
    form.namespace.trim();
  const destinationFieldsFilled =
    targetEnv.trim() &&
    targetPlatform.trim() &&
    (targetEnv === 'Cloud' ? cloudFieldsFilled : mqFieldsFilled);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(destinationDropdownKey);
    const testFlag = localStorage.getItem('destinationTestDone');
    const migrateFlag = localStorage.getItem('destinationMigrationDone');
    const storedConnected = localStorage.getItem(destinationConnectedKey);
    setTestDone(testFlag === 'true');
    setMigrationDone(migrateFlag === 'true');
    if (storedConnected === 'true') {
      setConnectionStatus('connected');
    }
    if (storedConnected === 'true') {
      const storedForm = localStorage.getItem(destinationFormKey);
      const storedQueues = localStorage.getItem(destinationQueuesKey);
      if (storedForm) {
        try {
          const parsed = JSON.parse(storedForm);
          if (parsed && typeof parsed === 'object') {
            setForm((prev) => ({ ...prev, ...parsed }));
          }
        } catch {
          // ignore malformed storage
        }
      }
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const { targetEnv: e = '', targetPlatform: p = '', computeModel: c = '', deploymentMode: d = '' } = parsed;
          setTargetEnv(e);
          setTargetPlatform(p);
          setComputeModel(c);
          setDeploymentMode(d);
        } catch {
          // ignore malformed storage
        }
      }
      if (storedQueues) {
        try {
          const parsedQueues = JSON.parse(storedQueues);
          if (Array.isArray(parsedQueues)) {
            setDestinationSelectedQueues(parsedQueues);
          }
        } catch {
          // ignore parse errors
        }
      }
      const storedPaths = localStorage.getItem(destinationQueuePathsKey);
      if (storedPaths) {
        try {
          const parsedPaths = JSON.parse(storedPaths);
          if (parsedPaths && typeof parsedPaths === 'object') {
            setDestinationQueuePaths(parsedPaths as Record<string, string>);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      setToastVisible(false);
      setToastProgress(100);
      return;
    }
    setToastVisible(true);
    setToastProgress(100);
    const animationFrame = requestAnimationFrame(() => {
      setToastProgress(0);
    });
    const fadeDelay = Math.max(toastDurationMs - toastFadeMs, 0);
    const fadeTimer = setTimeout(() => setToastVisible(false), fadeDelay);
    const clearTimer = setTimeout(() => {
      setToastMessage('');
      setToastTone('');
    }, toastDurationMs);
    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [toastMessage, toastDurationMs, toastFadeMs]);

  useEffect(() => {
    return () => {
      if (migrateSocketRef.current) {
        migrateSocketRef.current.close();
        migrateSocketRef.current = null;
      }
    };
  }, []);

  const closeMigrateSocket = () => {
    if (migrateSocketRef.current) {
      migrateSocketRef.current.close();
      migrateSocketRef.current = null;
    }
  };

  const migrateSocketTimeoutMs = 5 * 60 * 1000;

  const openMigrateSocket = () =>
    new Promise<WebSocket>((resolve, reject) => {
      closeMigrateSocket();
      const socket = new WebSocket(wsUrl('/logs'));
      migrateSocketRef.current = socket;
      let settled = false;
      let opened = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        socket.close();
        reject(new Error('WebSocket connection timeout'));
      }, migrateSocketTimeoutMs);

      socket.onopen = () => {
        opened = true;
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.log('WebSocket connection established');
        resolve(socket);
      };

      socket.onmessage = (event) => {
        console.log('Message received:', event.data);
        setLogs((prevLogs) => [...prevLogs, event.data]);
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
        if (!opened && !settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error('WebSocket closed before opening'));
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(error instanceof Error ? error : new Error('WebSocket error'));
        }
      };
    });

  const visibleQueues = useMemo(() => destinationQueues, [destinationQueues]);

  const statusChip =
    connectionStatus === 'connected'
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : 'bg-red-100 text-red-700 border border-red-200';

  const statusLabel = connectionStatus === 'connected' ? 'Connected' : 'Connection Not Tested';

  const hasSelection = destinationSelectedQueues.length > 0;
  const isReadyToMigrate = connectionStatus === 'connected' && hasSelection;
  const canMigrate = isReadyToMigrate && !isMigrateStreaming;
  const canViewReport = migrationDone;
  const step1Done = Boolean(destinationFieldsFilled) || connectionStatus === 'connected';
  const step2Done = step1Done && connectionStatus === 'connected';
  const step3Done = destinationSelectedQueues.length > 0;
  const step4Done = step3Done && migrationDone;
  const logLines = logs;
  const requirementSteps = [
    { label: 'Provide Destination connection credentials', done: step1Done },
    { label: 'Test connection', done: step2Done },
    { label: 'Select queue managers for migration', done: step3Done },
    { label: 'Migrate', done: step4Done },
  ];
  const currentRequirementIndex = requirementSteps.findIndex((step) => !step.done);
  const getRequirementBadgeClass = (index: number) => {
    const step = requirementSteps[index];
    const isDone = Boolean(step?.done);
    const isCurrent = !isDone && currentRequirementIndex === index;
    return isDone
      ? 'bg-black text-white'
      : isCurrent
        ? 'bg-gray-300 text-gray-700 animate-pulse'
        : 'bg-gray-200 text-gray-600';
  };

  const reportSectionOrder = [
    { key: 'queue', label: 'queue' },
    { key: 'subscription', label: 'subscription' },
    { key: 'channel', label: 'channel' },
    { key: 'topic', label: 'topic' },
    { key: 'service', label: 'service' },
    { key: 'channelAuth', label: 'channelAuth' },
    { key: 'listener', label: 'listener' },
    { key: 'nameList', label: 'nameList' },
  ];

  const reportSections = useMemo(
    () =>
      reportSectionOrder.map((section) => ({
        ...section,
        data: reportData?.[section.key as keyof MqReportResponse],
      })),
    [reportData],
  );

  const getReportCount = (section?: MqReportSection) =>
    section?.count ?? section?.listOfObjects?.length ?? 0;

  const buildSummarySection = (section?: DestinationSummarySection): MqReportSection => {
    const systemCount = section?.system ?? 0;
    const otherCount = section?.other ?? 0;
    return {
      count: systemCount + otherCount,
      listOfObjects: [
        { name: `system: ${systemCount}` },
        { name: `other: ${otherCount}` },
      ],
    };
  };

  const toggleReportSection = (key: string) => {
    setReportExpanded((prev) => {
      const current = prev[key] ?? true;
      return { ...prev, [key]: !current };
    });
  };

  const buildReportLines = () => {
    const lines: string[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC');
    lines.push('MQ Report');
    if (reportQueueName) {
      lines.push(`Queue Manager: ${reportQueueName}`);
    }
    lines.push(`Generated: ${timestamp}`);
    lines.push('');
    reportSections.forEach((section) => {
      const sectionData = section.data;
      const items = sectionData?.listOfObjects ?? [];
      lines.push(`${section.label} (${getReportCount(sectionData)})`);
      if (items.length) {
        items.forEach((item) => {
          const typeSuffix = item.type ? ` [${item.type}]` : '';
          lines.push(`  - ${item.name}${typeSuffix}`);
        });
      } else {
        lines.push('  (No entries)');
      }
      lines.push('');
    });
    return lines;
  };

  const escapePdfText = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const getByteLength = (value: string) => new TextEncoder().encode(value).length;

  const buildPdfDocument = (lines: string[]) => {
    const lineHeight = 14;
    const startY = 760;
    const bottomMargin = 40;
    const linesPerPage = Math.max(1, Math.floor((startY - bottomMargin) / lineHeight));
    const pages: string[][] = [];

    for (let i = 0; i < lines.length; i += linesPerPage) {
      pages.push(lines.slice(i, i + linesPerPage));
    }

    const header = '%PDF-1.4\n';
    const objectsById: string[] = [];

    objectsById[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const kids = pages.map((_, idx) => `${4 + idx} 0 R`).join(' ');
    objectsById[2] = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`;
    objectsById[3] = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

    pages.forEach((pageLines, idx) => {
      const pageObjNum = 4 + idx;
      const contentObjNum = 4 + pages.length + idx;
      objectsById[pageObjNum] =
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`;

      const contentLines = pageLines.length ? pageLines : [''];
      const content =
        'BT\n/F1 11 Tf\n' +
        `${lineHeight} TL\n` +
        `72 ${startY} Td\n` +
        contentLines
          .map((line, lineIndex) => {
            const escaped = escapePdfText(line);
            return lineIndex === 0 ? `(${escaped}) Tj` : `T* (${escaped}) Tj`;
          })
          .join('\n') +
        '\nET';
      const contentLength = getByteLength(content);
      objectsById[contentObjNum] =
        `${contentObjNum} 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}\nendstream\nendobj\n`;
    });

    const objects = objectsById.slice(1);
    let offset = getByteLength(header);
    const offsets = [0];
    objects.forEach((obj) => {
      offsets.push(offset);
      offset += getByteLength(obj);
    });

    const xrefStart = offset;
    let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((objOffset) => {
      xref += `${String(objOffset).padStart(10, '0')} 00000 n \n`;
    });
    const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    const pdf = header + objects.join('') + xref + trailer;

    return new Blob([pdf], { type: 'application/pdf' });
  };

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetProgress = () => {
    setConnectionStatus('untested');
    setTestDone(false);
    setMigrationDone(false);
    setDestinationSelectedQueues([]);
    setDestinationQueues([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('destinationTestDone');
      localStorage.removeItem('destinationMigrationDone');
    }
  };

  const toggleDestinationQueue = (name: string) => {
    setDestinationSelectedQueues((prev) => {
      const next = prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name];
      if (next.length === 0) {
        setToastMessage('Select at least one queue manager for migration.');
        setToastTone('error');
      }
      if (typeof window !== 'undefined' && connectionStatus === 'connected') {
        if (next.length > 0) {
          localStorage.setItem(destinationQueuesKey, JSON.stringify(next));
        } else {
          localStorage.removeItem(destinationQueuesKey);
        }
        if (targetEnv === 'Cloud') {
          const selectedPaths: Record<string, string> = {};
          next.forEach((queueName) => {
            const path = destinationQueuePaths[queueName];
            if (path) {
              selectedPaths[queueName] = path;
            }
          });
          localStorage.setItem(destinationQueuePathsKey, JSON.stringify(selectedPaths));
        }
      }
      return next;
    });
  };

  const handleTestConnection = async () => {
    if (connectionStatus === 'connected') {
      setConnectionStatus('untested');
      setTestDone(false);
      setDestinationSelectedQueues([]);
      setDestinationQueues([]);
      setDestinationQueuePaths({});
      setLogs([]);
      setMigrationDone(false);
      setForm({
        server: '',
        username: '',
        password: '',
        backupDir: '',
        clientId: '',
        clientSecret: '',
        tenantId: '',
        subscriptionId: '',
        resourceGroup: '',
        clusterName: '',
        namespace: '',
      });
      setTargetEnv('');
      setTargetPlatform('');
      setComputeModel('');
      setDeploymentMode('');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('destinationTestDone');
        localStorage.removeItem(destinationConnectedKey);
        localStorage.removeItem(destinationQueuesKey);
        localStorage.removeItem(destinationFormKey);
        localStorage.removeItem(destinationDropdownKey);
        localStorage.removeItem(destinationQueuePathsKey);
      }
      return;
    }

    setToastMessage('');
    setToastTone('');

    const isCloud = targetEnv === 'Cloud';
    const payload = isCloud
      ? {
          clientId: form.clientId.trim(),
          clientSecret: form.clientSecret,
          tenantId: form.tenantId.trim(),
          subscriptionId: form.subscriptionId.trim(),
        }
      : {
          destination: {
            server: form.server.trim(),
            user: form.username.trim(),
            password: form.password,
            backupPath: form.backupDir.trim(),
          },
        };

    if (typeof window !== 'undefined') {
      localStorage.setItem(destinationFormKey, JSON.stringify(form));
      localStorage.setItem(
        destinationDropdownKey,
        JSON.stringify({ targetEnv, targetPlatform, computeModel, deploymentMode }),
      );
    }

    try {
      const accessToken =
        typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!accessToken) {
        setConnectionStatus('untested');
        setTestDone(false);
        setToastMessage('Missing access token. Please log in again.');
        setToastTone('error');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('destinationTestDone');
          localStorage.removeItem(destinationConnectedKey);
        }
        return;
      }
      const response = await fetch(
        isCloud
          ? apiUrl('/azure/login')
          : `${apiUrl('/v1/store-server-cred')}?calledFrom=destination`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const responseText = await response.text();
      let data: unknown = null;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.warn('Destination connection response was not JSON:', parseError);
        data = null;
      }

      console.log('Destination connection response:', data);

      let isSuccess = response.ok;
      let message = response.ok ? 'Connection successful' : 'Connection not successful';

      if (data && typeof data === 'object') {
        const record = data as {
          responseCode?: string;
          responseMsg?: string;
          message?: string;
          success?: boolean;
        };
        const responseCode = record.responseCode ? String(record.responseCode) : '';
        const responseMsg = record.responseMsg ? String(record.responseMsg) : '';
        const responseMessage = record.message ? String(record.message) : '';
        if (record.success === true) {
          isSuccess = true;
        }
        if (responseCode === '00' || responseMsg.toLowerCase() === 'success') {
          isSuccess = true;
        }
        if (
          responseMessage.toLowerCase() === 'azure login successful' ||
          responseMessage.toLowerCase() === 'server credentials updated successfully!'
        ) {
          isSuccess = true;
        }
        const messageCandidate = responseMessage || record.responseMsg;
        if (responseMessage) {
          message = String(responseMessage);
        } else if (messageCandidate) {
          message = String(messageCandidate);
        }
      }

      setToastMessage(message);
      setToastTone(isSuccess ? 'success' : 'error');
      if (isSuccess) {
        setConnectionStatus('connected');
        setTestDone(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('destinationTestDone', 'true');
          localStorage.setItem(destinationConnectedKey, 'true');
          if (destinationSelectedQueues.length > 0) {
            localStorage.setItem(destinationQueuesKey, JSON.stringify(destinationSelectedQueues));
          } else {
            localStorage.removeItem(destinationQueuesKey);
          }
        }
      } else {
        setConnectionStatus('untested');
        setTestDone(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('destinationTestDone');
          localStorage.removeItem(destinationConnectedKey);
        }
      }
    } catch (error) {
      setConnectionStatus('untested');
      setTestDone(false);
      setToastMessage('Connection not successful');
      setToastTone('error');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('destinationTestDone');
        localStorage.removeItem(destinationConnectedKey);
      }
      console.error('Destination connection error:', error);
    }
  };

  const handleMigrate = async () => {
    if (connectionStatus !== 'connected' || isMigrateStreaming) {
      return;
    }
    if (destinationSelectedQueues.length === 0) {
      setToastMessage('Select at least one queue manager for migration.');
      setToastTone('error');
      return;
    }
    setToastMessage('');
    setToastTone('');
    setMigrationDone(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('destinationMigrationDone');
    }
    setIsMigrateStreaming(true);

    try {
      await openMigrateSocket();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setToastMessage('Unable to connect to log stream.');
      setToastTone('error');
      setIsMigrateStreaming(false);
      closeMigrateSocket();
      return;
    }

    const accessToken =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    const parseResponse = async (response: Response) => {
      const responseText = await response.text();
      if (!responseText) {
        return null;
      }
      try {
        return JSON.parse(responseText);
      } catch (error) {
        console.warn('Migration response was not JSON:', error);
        return null;
      }
    };

    const selectedQueue = destinationSelectedQueues[0];
    const isCloud = targetEnv === 'Cloud';

    try {
      if (!isCloud) {
        const migratePayload = { mqNames: destinationSelectedQueues };
        console.log('Migrate request:', migratePayload);
        const migrateResponse = await fetch(apiUrl('/v1/migrate'), {
          method: 'POST',
          headers,
          body: JSON.stringify(migratePayload),
        });
        const migrateData = await parseResponse(migrateResponse);
        console.log('Migrate response:', migrateData);

        const record = migrateData && typeof migrateData === 'object' ? (migrateData as {
          responseCode?: string;
          responseMsg?: string;
          message?: string;
        }) : null;
        const responseCode = record?.responseCode ? String(record.responseCode) : '';
        const responseMsg = record?.responseMsg ? String(record.responseMsg) : '';
        const messageText = record?.message ? String(record.message) : '';
        const normalizedMsg = responseMsg.trim().toLowerCase();
        const normalizedMessage = messageText.trim().toLowerCase();
        const isSuccess =
          responseCode === '00' ||
          normalizedMsg === 'success' ||
          normalizedMessage.includes('migration completed successfully');
        const message = record?.message
          ? String(record.message)
          : isSuccess
            ? 'Migration completed successfully.'
            : 'Migration failed.';

        if (isSuccess) {
          setMigrationDone(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('destinationMigrationDone', 'true');
          }
        } else {
          setMigrationDone(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('destinationMigrationDone');
          }
        }
        return;
      }

      const azureLoginPayload = {
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret,
        tenantId: form.tenantId.trim(),
        subscriptionId: form.subscriptionId.trim(),
      };
      console.log('Azure login request:', azureLoginPayload);
      const azureLoginResponse = await fetch(apiUrl('/azure/login'), {
        method: 'POST',
        headers,
        body: JSON.stringify(azureLoginPayload),
      });
      const azureLoginData = await parseResponse(azureLoginResponse);
      console.log('Azure login response:', azureLoginData);

      const normalizedDeploymentMode = deploymentMode.trim();
      const nodeCount =
        normalizedDeploymentMode === 'Standalone'
          ? 1
          : normalizedDeploymentMode === 'Multiinstance'
            ? 2
            : normalizedDeploymentMode === 'RDQM'
              ? 3
              : 3;
      const queueManagerName =
        normalizedDeploymentMode === 'Standalone'
          ? 'standalone'
          : normalizedDeploymentMode === 'Multiinstance'
            ? 'multiinstance'
            : normalizedDeploymentMode === 'RDQM'
              ? 'RDQM'
              : 'multiinstance';

      const aksCreatePayload = {
        resourceGroup: form.resourceGroup.trim(),
        clusterName: form.clusterName.trim(),
        region: 'eastus',
        nodeCount,
      };
      console.log('AKS create request:', aksCreatePayload);
      const aksCreateResponse = await fetch(apiUrl('/aks/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify(aksCreatePayload),
      });
      const aksCreateData = await parseResponse(aksCreateResponse);
      console.log('AKS create response:', aksCreateData);

      const aksCredentialsPayload = {
        resourceGroup: form.resourceGroup.trim(),
        clusterName: form.clusterName.trim(),
      };
      console.log('AKS get-credentials request:', aksCredentialsPayload);
      const aksCredentialsResponse = await fetch(
        apiUrl('/aks/get-credentials'),
        {
          method: 'POST',
          headers,
          body: JSON.stringify(aksCredentialsPayload),
        },
      );
      const aksCredentialsData = await parseResponse(aksCredentialsResponse);
      console.log('AKS get-credentials response:', aksCredentialsData);

      const kubeconfigPath =
        aksCredentialsData && typeof aksCredentialsData === 'object'
          ? String((aksCredentialsData as { kubeconfigPath?: string }).kubeconfigPath ?? '')
          : '';

      if (!kubeconfigPath) {
        setToastMessage('kubeconfigPath missing in credentials response.');
        setToastTone('error');
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('kubeconfigPath', kubeconfigPath);
      }

      const mqInstallPayload = {
        targetNamespace: form.namespace.trim(),
        kubeconfigPath,
      };
      console.log('MQ install request:', mqInstallPayload);
      const mqInstallResponse = await fetch(apiUrl('/mq/install'), {
        method: 'POST',
        headers: {
          ...headers,
          kubeconfigPath,
        },
        body: JSON.stringify(mqInstallPayload),
      });
      const mqInstallData = await parseResponse(mqInstallResponse);
      console.log('MQ install response:', mqInstallData);

      const mqscPayload = {
        kubeconfigPath,
        namespace: form.namespace.trim(),
        queueManagerName,
        mqscFilePath:
          targetEnv === 'Cloud' ? '' : `/MQMigratorBackup/backupfromsource/${selectedQueue}.mqsc`,
      };
      if (targetEnv === 'Cloud') {
        const storedPaths =
          typeof window !== 'undefined'
            ? (JSON.parse(localStorage.getItem(destinationQueuePathsKey) ?? '{}') as Record<
                string,
                string
              >)
            : {};
        mqscPayload.mqscFilePath = storedPaths[selectedQueue] ?? '';
      }
      console.log('MQ load-mqsc request:', mqscPayload);
      const mqscResponse = await fetch(apiUrl('/mq/load-mqsc'), {
        method: 'POST',
        headers: {
          ...headers,
          kubeconfigPath,
        },
        body: JSON.stringify(mqscPayload),
      });
      const mqscData = await parseResponse(mqscResponse);
      console.log('MQ load-mqsc response:', mqscData);

      const mqscRecord = mqscData && typeof mqscData === 'object' ? (mqscData as {
        responseCode?: string;
        responseMsg?: string;
        message?: string;
      }) : null;
      const mqscCode = mqscRecord?.responseCode ? String(mqscRecord.responseCode) : '';
      const mqscMsg = mqscRecord?.responseMsg ? String(mqscRecord.responseMsg) : '';
      const mqscMessageText = mqscRecord?.message ? String(mqscRecord.message) : '';
      const mqscSuccess =
        mqscCode === '00' ||
        mqscMsg.trim().toLowerCase() === 'success' ||
        mqscMessageText.trim().toLowerCase().includes('migration completed successfully');
      const mqscMessage = mqscRecord?.message
        ? String(mqscRecord.message)
        : mqscSuccess
          ? 'Migration completed successfully.'
          : 'Migration failed.';

      if (mqscSuccess) {
        setMigrationDone(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('destinationMigrationDone', 'true');
        }
      } else {
        setMigrationDone(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('destinationMigrationDone');
        }
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationDone(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('destinationMigrationDone');
      }
    } finally {
      setIsMigrateStreaming(false);
      closeMigrateSocket();
    }
  };

  const handleViewReport = async (mqName: string) => {
    setReportQueueName(mqName);
    setReportError('');
    setReportData(null);
    setShowReportModal(true);
    setReportLoading(true);

    try {
      const accessToken =
        typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!accessToken) {
        setReportError('Missing access token. Please log in again.');
        setReportLoading(false);
        return;
      }
      const summaryMode = targetEnv === 'Cloud' ? 'cloud' : 'vm';
      const response = await fetch(
        `${apiUrl(`/v1/destination/summary?mode=${summaryMode}`)}?accessToken=${encodeURIComponent(accessToken)}`,
        {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ mqNames: [mqName] }),
      },
      );
      const responseText = await response.text();
      let data: unknown = null;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.warn('MQ report response was not JSON:', parseError);
        data = null;
      }

      if (!response.ok) {
        setReportError('Unable to load MQ report.');
        return;
      }

      if (!data || typeof data !== 'object') {
        setReportError('No report data returned.');
        return;
      }

      const summaryResponse = data as DestinationSummaryResponse;
      const responseCode = summaryResponse?.responseCode
        ? String(summaryResponse.responseCode)
        : '';
      if (responseCode !== '00') {
        setReportError(summaryResponse?.responseMsg || 'Unable to load MQ report.');
        return;
      }
      const summaryData = summaryResponse?.data?.[mqName];
      if (!summaryData) {
        setReportError('No report data returned.');
        return;
      }

      setReportData({
        queue: buildSummarySection(summaryData.queue),
        subscription: buildSummarySection(summaryData.subscription),
        channel: buildSummarySection(summaryData.channel),
        topic: buildSummarySection(summaryData.topic),
        service: buildSummarySection(summaryData.service),
        channelAuth: buildSummarySection(summaryData.channelAuth),
        listener: buildSummarySection(summaryData.listener),
        nameList: buildSummarySection(summaryData.nameList),
      });
      setReportExpanded({
        queue: false,
        subscription: false,
        channel: false,
        topic: false,
        service: false,
        channelAuth: false,
        listener: false,
        nameList: false,
      });
    } catch (error) {
      console.error('MQ report fetch error:', error);
      setReportError('Unable to load MQ report.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportError('');
    setReportData(null);
    setReportQueueName('');
    setReportExpanded({});
    setReportLoading(false);
  };

  const handleDownloadReport = () => {
    if (!reportData) {
      setReportError('No report data to download.');
      return;
    }
    const lines = buildReportLines();
    const pdfBlob = buildPdfDocument(lines);
    const url = URL.createObjectURL(pdfBlob);
    const safeName = reportQueueName
      ? reportQueueName.replace(/[^A-Za-z0-9_.-]+/g, '_')
      : 'mq_report';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}_report.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const resetPlatformAndBelow = (env: string) => {
    setTargetEnv(env);
    setTargetPlatform('');
    setComputeModel('');
    setDeploymentMode('');
  };

  const resetComputeAndBelow = (platform: string) => {
    setTargetPlatform(platform);
    setComputeModel('');
    setDeploymentMode('');
  };

  const resetDeployment = (compute: string) => {
    setComputeModel(compute);
    setDeploymentMode('');
  };

  const handleTargetEnvChange = (value: string) => {
    const nextValue = value === clearSelectValue ? '' : value;
    resetPlatformAndBelow(nextValue);
  };

  const handleTargetPlatformChange = (value: string) => {
    const nextValue = value === clearSelectValue ? '' : value;
    resetComputeAndBelow(nextValue);
  };

  const handleComputeModelChange = (value: string) => {
    const nextValue = value === clearSelectValue ? '' : value;
    resetDeployment(nextValue);
  };

  const handleDeploymentModeChange = (value: string) => {
    const nextValue = value === clearSelectValue ? '' : value;
    setDeploymentMode(nextValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        destinationDropdownKey,
        JSON.stringify({ targetEnv, targetPlatform, computeModel, deploymentMode: nextValue }),
      );
    }
  };

  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setDestinationQueues([]);
      return;
    }

    const controller = new AbortController();

    const fetchDestinationQueues = async () => {
      try {
        const accessToken =
          typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!accessToken) {
          setDestinationQueues([]);
          return;
        }
        const backupFrom = targetEnv === 'Cloud' ? 'local' : 'shared';
        const response = await fetch(
          apiUrl(`/v1/destination/mq/list?backupFrom=${backupFrom}`),
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
          },
        );
        const responseText = await response.text();
        let data: unknown = null;

        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
          console.warn('Destination MQ list was not JSON:', parseError);
          data = null;
        }

        if (Array.isArray(data)) {
          const mapped = data
            .map((item) => {
              if (!item || typeof item !== 'object') {
                return null;
              }
              const record = item as { name?: string; state?: string; path?: string };
              if (!record.name) {
                return null;
              }
              return {
                name: String(record.name),
                state: record.state ? String(record.state) : undefined,
              };
            })
            .filter(Boolean) as QueueManager[];
          const queuePaths: Record<string, string> = {};
          if (targetEnv === 'Cloud') {
            data.forEach((item) => {
              if (!item || typeof item !== 'object') {
                return;
              }
              const record = item as { name?: string; path?: string };
              if (record.name && record.path) {
                queuePaths[String(record.name)] = String(record.path);
              }
            });
          }
          setDestinationQueues(mapped);
          setDestinationQueuePaths(queuePaths);
          setDestinationSelectedQueues((prev) =>
            prev.filter((name) => mapped.some((queue) => queue.name === name)),
          );
        } else {
          setDestinationQueues([]);
          setDestinationQueuePaths({});
        }
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          console.error('Destination MQ list error:', error);
        }
      }
    };

    fetchDestinationQueues();

    return () => controller.abort();
  }, [connectionStatus, targetEnv]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-gray-50 border-0 shadow-none p-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Destination</h1>
            <p className="text-gray-600 mt-3">
              Connect to the destination MQ server and configure deployment settings before backup.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startGuide}
              className="h-6 w-6 rounded-full border border-gray-300 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:border-gray-400"
              aria-label="Open guided journey"
            >
              ?
            </button>
            <button
              type="button"
              onClick={resetProgress}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Reset
            </button>
          </div>


        </div>

        {/* Progress checkpoints */}
        {/* <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-5"> */}
          
          <div className="relative mt-4">
            <div className="absolute left-6 right-6 top-6 h-px bg-gray-200" />
            <div className="flex justify-between relative">
              {requirementSteps.map((step, idx) => {
                const pillClass = getRequirementBadgeClass(idx);
                return (
                  <div key={step.label} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${pillClass}`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        {/* </div> */}

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Destination Connection Card */}
          <div
            ref={destinationFormRef}
            className={`rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm h-full flex flex-col md:col-start-1 md:row-start-1 ${
              connectionStatus === 'connected' ? 'hidden' : ''
            }`}
          >
            <div className="mb-3">
              <span
                className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(0)}`}
              >
                Requirement 1: provide Destination connection credentials
              </span>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-800">Destination Connection</p>
                <p className="text-xs text-gray-500 mt-1">
                  Set the destination environment and credentials. No data is migrated in this static preview.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4 flex-1">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Target Environment</label>
                  <Select value={targetEnv} onValueChange={handleTargetEnvChange}>
                  <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:border-gray-400 focus-visible:ring-2 focus-visible:ring-gray-300 *:data-[slot=select-value]:mx-auto *:data-[slot=select-value]:w-full *:data-[slot=select-value]:justify-center *:data-[slot=select-value]:text-center">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border border-gray-200 bg-white text-gray-800">
                      <SelectItem className="justify-center text-center" value={clearSelectValue}>
                        None
                      </SelectItem>
                      <SelectItem className="justify-center text-center" value="VM">
                        VM
                      </SelectItem>
                      <SelectItem className="justify-center text-center" value="Host Systems">
                        Host Systems
                      </SelectItem>
                      <SelectItem className="justify-center text-center" value="Cloud">
                        Cloud
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Target Platform</label>
                  <Select
                    value={targetPlatform}
                    onValueChange={handleTargetPlatformChange}
                    disabled={!targetEnv}
                  >
                    <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:border-gray-400 focus-visible:ring-2 focus-visible:ring-gray-300 disabled:opacity-60 *:data-[slot=select-value]:mx-auto *:data-[slot=select-value]:w-full *:data-[slot=select-value]:justify-center *:data-[slot=select-value]:text-center">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border border-gray-200 bg-white text-gray-800">
                      <SelectItem className="justify-center text-center" value={clearSelectValue}>
                        None
                      </SelectItem>
                      {platformOptions.map((opt) => (
                        <SelectItem className="justify-center text-center" key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Compute Model</label>
                  <Select
                    value={computeModel}
                    onValueChange={handleComputeModelChange}
                    disabled={!computeOptions.length}
                  >
                    <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:border-gray-400 focus-visible:ring-2 focus-visible:ring-gray-300 disabled:opacity-60 *:data-[slot=select-value]:mx-auto *:data-[slot=select-value]:w-full *:data-[slot=select-value]:justify-center *:data-[slot=select-value]:text-center">
                      <SelectValue placeholder="Select compute model" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border border-gray-200 bg-white text-gray-800">
                      <SelectItem className="justify-center text-center" value={clearSelectValue}>
                        None
                      </SelectItem>
                      {computeOptions.map((opt) => (
                        <SelectItem className="justify-center text-center" key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Deployment Mode</label>
                  <Select
                    value={deploymentMode}
                    onValueChange={handleDeploymentModeChange}
                    disabled={!deploymentOptions.length}
                  >
                    <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:border-gray-400 focus-visible:ring-2 focus-visible:ring-gray-300 disabled:opacity-60 *:data-[slot=select-value]:mx-auto *:data-[slot=select-value]:w-full *:data-[slot=select-value]:justify-center *:data-[slot=select-value]:text-center">
                      <SelectValue placeholder="Select deployment mode" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border border-gray-200 bg-white text-gray-800">
                      <SelectItem className="justify-center text-center" value={clearSelectValue}>
                        None
                      </SelectItem>
                      {deploymentOptions.map((opt) => (
                        <SelectItem className="justify-center text-center" key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {targetEnv !== 'Cloud' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Destination MQ Server</label>
                    <input
                      value={form.server}
                      onChange={(e) => handleChange('server', e.target.value)}
                      placeholder="mq-prod-01.company.com:1414"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700">Username</label>
                      <input
                        value={form.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                        placeholder="root"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700">Password</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="********"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Target Backup Directory</label>
                    <input
                      value={form.backupDir}
                      onChange={(e) => handleChange('backupDir', e.target.value)}
                      placeholder="/var/backups/mq-migrator/"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-800">Cloud Credentials</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Client ID</label>
                      <input
                        value={form.clientId}
                        onChange={(e) => handleChange('clientId', e.target.value)}
                        placeholder="Client ID"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Client Secret</label>
                      <input
                        type="password"
                        value={form.clientSecret}
                        onChange={(e) => handleChange('clientSecret', e.target.value)}
                        placeholder="***************"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Tenant ID</label>
                      <input
                        value={form.tenantId}
                        onChange={(e) => handleChange('tenantId', e.target.value)}
                        placeholder="Tenant ID"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Subscription ID</label>
                      <input
                        value={form.subscriptionId}
                        onChange={(e) => handleChange('subscriptionId', e.target.value)}
                        placeholder="Subscription ID"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Resource Group Name</label>
                      <input
                        value={form.resourceGroup}
                        onChange={(e) => handleChange('resourceGroup', e.target.value)}
                        placeholder="Resource Group"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Cluster Name</label>
                      <input
                        value={form.clusterName}
                        onChange={(e) => handleChange('clusterName', e.target.value)}
                        placeholder="Cluster Name"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Namespace</label>
                    <input
                      value={form.namespace}
                      onChange={(e) => handleChange('namespace', e.target.value)}
                      placeholder="Default"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                </div>
              )}

            </div>

            <div
              ref={connectActionRef}
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span
                className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(1)}`}
              >
                Requirement 2: Test Connection
              </span>
              <button
                type="button"
                onClick={handleTestConnection}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  connectionStatus === 'connected'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200/60 focus-visible:ring-red-300 focus-visible:ring-offset-gray-100'
                    : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-200/70 hover:from-emerald-600 hover:via-emerald-600 hover:to-teal-600 hover:shadow-emerald-300/80 active:scale-[0.98] focus-visible:ring-emerald-300 focus-visible:ring-offset-gray-100'
                }`}
              >
                <span>{connectionStatus === 'connected' ? 'Disconnect' : 'Connect'}</span>
                <Link2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Queue Managers Card */}
          <div
            ref={queueManagersRef}
            className={`rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm flex flex-col min-h-[520px] md:col-start-1 md:row-start-1 ${
              connectionStatus === 'connected' ? '' : 'hidden'
            }`}
          >
            {step2Done && (
              <div className="mb-3">
                <span
                  className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(2)}`}
                >
                  Requirement 3: Select queue managers for migration
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-gray-800">Queue Managers</p>
                <p className="text-xs text-gray-500 mt-1">
                  Select Queue Managers for migration.
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              {visibleQueues.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-600 font-semibold bg-white border border-dashed border-gray-300 rounded-xl gap-2 min-h-[240px]">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                  No queue managers available.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr] text-xs font-semibold text-gray-500 px-3 py-2">
                    <span>Queue Manager</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {visibleQueues.map((queue) => (
                      <div
                        key={queue.name}
                        className="grid grid-cols-[1fr] items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 hover:border-gray-300"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={destinationSelectedQueues.includes(queue.name)}
                            onChange={() => toggleDestinationQueue(queue.name)}
                            className="h-4 w-4 accent-gray-500"
                          />
                          <span>{queue.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={migrateActionRef} className="mt-auto">
                {step2Done && (
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(3)}`}
                    >
                      Requirement 4: Migrate
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    className="flex-1 rounded-lg border border-red-500 px-6 py-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    Disconnect
                  </button>
                  <button
                    type="button"
                    disabled={!canMigrate}
                    onClick={handleMigrate}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-semibold shadow-sm ${
                      isMigrateStreaming
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-black hover:bg-gray-900 text-white'
                    }`}
                  >
                    {isMigrateStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    {isMigrateStreaming ? 'Migrating...' : 'Migrate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-neutral-900 text-gray-100 border border-neutral-800 shadow-inner p-6 text-sm md:col-start-2 md:row-start-1 flex flex-col h-[520px] min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-white">Event Logs</p>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-neutral-400 hover:text-white"
                aria-label="Refresh logs"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
            <ScrollArea className="flex-1 min-h-0 pr-1" type="always">
              <div className="space-y-2">
                {isMigrateStreaming && (
                  <div className="flex items-center gap-2 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2 text-emerald-200 font-mono text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Migration in progress...</span>
                  </div>
                )}
                {[...logLines].reverse().map((line, idx) => (
                  <div
                    key={`${line}-${idx}`}
                    className="flex items-start gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2"
                  >
                    <p className="text-emerald-200 font-mono text-sm leading-6">{line}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>


      {isGuideOpen && guideRect && guideStepData ? (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="absolute inset-0">
            <div
              className="absolute left-0 top-0 w-full bg-black/20 backdrop-blur-sm pointer-events-auto"
              style={{ height: overlayTopHeight }}
            />
            <div
              className="absolute left-0 w-full bg-black/20 backdrop-blur-sm pointer-events-auto"
              style={{ top: overlayBottomTop, height: overlayBottomHeight }}
            />
            <div
              className="absolute left-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
              style={{
                top: Math.max(guideRect.top - highlightPadding, highlightPadding),
                width: overlayLeftWidth,
                height: overlaySideHeight,
              }}
            />
            <div
              className="absolute bg-black/20 backdrop-blur-sm pointer-events-auto"
              style={{
                top: Math.max(guideRect.top - highlightPadding, highlightPadding),
                left: overlayRightLeft,
                width: overlayRightWidth,
                height: overlaySideHeight,
              }}
            />
          </div>
          {highlightStyle && (
            <div
              className="absolute rounded-2xl border-2 border-white/80 shadow-[0_0_0_4px_rgba(255,255,255,0.2)] pointer-events-none"
              style={highlightStyle}
            />
          )}
          <div className="absolute pointer-events-auto" style={guideCalloutStyle}>
            <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-xl text-gray-800">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Step {guideStep + 1} of {guideSteps.length}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-800">{guideStepData.title}</p>
              <p className="mt-2 text-sm text-gray-600">{guideStepData.body}</p>
              {guideStepData.examples?.length ? (
                <div className="mt-3 text-xs text-gray-500">
                  <p className="font-semibold text-gray-600">Examples</p>
                  <ul className="mt-1 space-y-1 font-mono">
                    {guideStepData.examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleGuideSkip}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleGuideNext}
                  className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-gray-900"
                >
                  {guideStep === guideSteps.length - 1 ? 'Done' : 'Next'}
                </button>
              </div>
              <div
                className={`absolute h-3 w-3 rotate-45 border border-gray-200 bg-white ${
                  guidePlacement === 'right'
                    ? 'left-[-6px] top-6'
                    : guidePlacement === 'left'
                      ? 'right-[-6px] top-6'
                      : guidePlacement === 'bottom'
                        ? 'top-[-6px] left-6'
                        : 'bottom-[-6px] left-6'
                }`}
              />
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div
          className={`fixed bottom-6 right-6 z-50 w-72 rounded-xl border bg-white shadow-lg px-4 py-3 transition-opacity duration-300 ${
            toastVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              toastTone === 'error' ? 'text-red-600' : 'text-gray-800'
            }`}
          >
            {toastMessage}
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-[width] ease-linear ${
                toastTone === 'error' ? 'bg-red-500' : 'bg-gray-900'
              }`}
              style={{ width: `${toastProgress}%`, transitionDuration: `${toastDurationMs}ms` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
