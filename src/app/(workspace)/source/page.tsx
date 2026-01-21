'use client';




import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';

import { ArrowLeft, CloudUpload, Download, Link2, Loader2, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';


type QueueManager = {

  name: string;

  state: string;

};

type MqReportEntry = {
  name: string;
  type?: string;
};

type MqReportSection = {
  listOfObjects?: MqReportEntry[];
  count?: number;
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



export default function SourcePage() {

  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected'>('untested');

  const [toastMessage, setToastMessage] = useState('');

  const [toastTone, setToastTone] = useState<'success' | 'error' | ''>('');

  const [toastVisible, setToastVisible] = useState(false);

  const [toastProgress, setToastProgress] = useState(100);

  const [isBackupStreaming, setIsBackupStreaming] = useState(false);

  const [queueManagers, setQueueManagers] = useState<QueueManager[]>([]);

  const [backupDone, setBackupDone] = useState(false);

  const [testDone, setTestDone] = useState(false);

  const [migrationDone, setMigrationDone] = useState(false);

  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);

  const [logs, setLogs] = useState<string[]>([]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportData, setReportData] = useState<MqReportResponse | null>(null);
  const [reportQueueName, setReportQueueName] = useState('');
  const [reportExpanded, setReportExpanded] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({

    server: '',

    username: '',

    password: '',

    backupDir: '',

    transferMode: 'local',

  });

  const [sftpDetails, setSftpDetails] = useState({

    server: '',

    username: '',

    password: '',

    backupDir: '',

  });

  const [scpDetails, setScpDetails] = useState({
    server: '',
    username: '',
    password: '',
    backupDir: '',
  });
  const [showSourcePassword, setShowSourcePassword] = useState(false);
  const [showSftpPassword, setShowSftpPassword] = useState(false);
  const [showScpPassword, setShowScpPassword] = useState(false);
  const sourceFormKey = 'sourceForm';

  const sourceSftpKey = 'sourceSftp';

  const sourceScpKey = 'sourceScp';

  const [isTransitioning] = useState(false);

  const [showBackupModal, setShowBackupModal] = useState(false);

  const toastDurationMs = 3000;

  const toastFadeMs = 300;

  const guideStorageKey = 'sourceGuideSeen';

  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [guideStep, setGuideStep] = useState(0);

  const [guideRect, setGuideRect] = useState<DOMRect | null>(null);

  const [guidePlacement, setGuidePlacement] = useState<'right' | 'left' | 'top' | 'bottom'>(

    'right',

  );

  const [guideCalloutStyle, setGuideCalloutStyle] = useState<CSSProperties>({});

  const sourceFormRef = useRef<HTMLDivElement>(null);

  const connectActionRef = useRef<HTMLDivElement>(null);

  const queueManagersRef = useRef<HTMLDivElement>(null);

  const backupActionRef = useRef<HTMLDivElement>(null);

  const router = useRouter();



  const guideSteps = useMemo<GuideStep[]>(

    () => [

      {

        title: 'Requirement 1: Provide MQ Server details',

        body: 'Fill in the source MQ server, credentials, and backup directory. Choose transfer mode if needed.',

        examples: ['mq-prod-01.company.com:1414', '/var/backups/mq-migrator/'],

        targetRef: sourceFormRef,

      },

      {

        title: 'Requirement 2: Test connection',

        body: 'Click Connect to validate credentials. Disconnect if you need to edit fields.',

        targetRef: connectActionRef,

      },

      {

        title: 'Requirement 3: Select queue managers for backup',

        body: 'Pick at least one queue manager to include in the backup.',

        targetRef: queueManagersRef,

      },

      {

        title: 'Requirement 4: Backup',

        body: 'Start the backup and track progress in the Event Logs.',

        targetRef: backupActionRef,

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



  const resetProgress = () => {

    setConnectionStatus('untested');

    setBackupDone(false);

    setTestDone(false);

    setMigrationDone(false);

    setSelectedQueues([]);

    if (typeof window !== 'undefined') {

      localStorage.removeItem('backupDone');

      localStorage.removeItem('testDone');

      localStorage.removeItem('migrationDone');

      localStorage.removeItem('sourceConnected');

      localStorage.removeItem('selectedQueues');

    }

  };



  useEffect(() => {

    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('backupDone');

    const storedTest = localStorage.getItem('testDone');

    const storedMigration = localStorage.getItem('migrationDone');

    const storedConnected = localStorage.getItem('sourceConnected');

    const storedSelected = localStorage.getItem('selectedQueues');

    const loginToast = localStorage.getItem('loginToast');

    setBackupDone(stored === 'true');

    setTestDone(storedTest === 'true');

    setMigrationDone(storedMigration === 'true');

    if (storedConnected === 'true') {

      setConnectionStatus('connected');

    }

    if (storedSelected) {

      try {

        const parsedSel = JSON.parse(storedSelected);

        if (Array.isArray(parsedSel)) {

          setSelectedQueues(parsedSel);

        }

      } catch {

        // ignore parse errors

      }

    }

    if (loginToast) {

      try {

        const parsed = JSON.parse(loginToast) as { message?: string; tone?: 'success' | 'error' };

        if (parsed?.message) {

          setToastMessage(parsed.message);

          setToastTone(parsed.tone === 'error' ? 'error' : 'success');

        }

      } catch {

        // ignore malformed login toast

      }

      localStorage.removeItem('loginToast');

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

    if (!isBackupStreaming) return;

    const socket = new WebSocket('ws://192.168.18.35:8080/logs');



    socket.onopen = () => {

      console.log('WebSocket connection established');

    };

    socket.onmessage = (event) => {

      console.log('Message received:', event.data);

      setLogs((prevLogs) => [...prevLogs, event.data]);

    };

    socket.onclose = () => {

      console.log('WebSocket connection closed');

    };

    socket.onerror = (error) => {

      console.error('WebSocket error:', error);

    };



    return () => {

      socket.close();

    };

  }, [isBackupStreaming]);



  useEffect(() => {

    if (typeof window === 'undefined') return;

    const storedForm = localStorage.getItem(sourceFormKey);

    const storedSftp = localStorage.getItem(sourceSftpKey);

    const storedScp = localStorage.getItem(sourceScpKey);

    if (storedForm) {

      try {

        const parsed = JSON.parse(storedForm);

        if (parsed && typeof parsed === 'object') {

          setForm((prev) => ({ ...prev, ...parsed }));

        }

      } catch {

        // ignore parse errors

      }

    }

    if (storedSftp) {

      try {

        const parsed = JSON.parse(storedSftp);

        if (parsed && typeof parsed === 'object') {

          setSftpDetails((prev) => ({ ...prev, ...parsed }));

        }

      } catch {

        // ignore parse errors

      }

    }

    if (storedScp) {

      try {

        const parsed = JSON.parse(storedScp);

        if (parsed && typeof parsed === 'object') {

          setScpDetails((prev) => ({ ...prev, ...parsed }));

        }

      } catch {

        // ignore parse errors

      }

    }

  }, []);



  useEffect(() => {

    if (connectionStatus !== 'connected') {

      setQueueManagers([]);

      return;

    }



    const controller = new AbortController();



    const fetchQueueManagers = async () => {

      try {

        const accessToken =

          typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

        const response = await fetch('http://192.168.18.35:8080/v1/get-all-running-mq', {

          method: 'GET',

          headers: {

            Accept: 'application/json',

            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),

          },

          signal: controller.signal,

        });

        const responseText = await response.text();

        let data: unknown = null;



        try {

          data = responseText ? JSON.parse(responseText) : null;

        } catch (parseError) {

          console.warn('Queue manager response was not JSON:', parseError);

          data = null;

        }



        if (Array.isArray(data)) {

          const mapped = data

            .map((item) => {

              if (!item || typeof item !== 'object') {

                return null;

              }

              const record = item as { name?: string; state?: string };

              if (!record.name) {

                return null;

              }

              return {

                name: String(record.name),

                state: String(record.state ?? ''),

              };

            })

            .filter(Boolean) as QueueManager[];

          setQueueManagers(mapped);

        } else {

          setQueueManagers([]);

        }

      } catch (error) {

        if ((error as { name?: string }).name !== 'AbortError') {

          console.error('Queue manager fetch error:', error);

        }

      }

    };



    fetchQueueManagers();



    return () => controller.abort();

  }, [connectionStatus]);



  const baseFieldsFilled =

    form.server.trim() && form.username.trim() && form.password.trim() && form.backupDir.trim();

  const sftpFieldsFilled =

    sftpDetails.server.trim() &&

    sftpDetails.username.trim() &&

    sftpDetails.password.trim() &&

    sftpDetails.backupDir.trim();

  const scpFieldsFilled =

    scpDetails.server.trim() &&

    scpDetails.username.trim() &&

    scpDetails.password.trim() &&

    scpDetails.backupDir.trim();

  const fieldsFilled =

    baseFieldsFilled &&

    (form.transferMode === 'shared-sftp'

      ? sftpFieldsFilled

      : form.transferMode === 'shared-scp'

        ? scpFieldsFilled

        : form.transferMode.trim());



  const statusChip =

    connectionStatus === 'connected'

      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'

      : 'bg-red-100 text-red-700 border border-red-200';



  const statusLabel = connectionStatus === 'connected' ? 'Connected' : 'Not Connected';



  const handleChange = (key: keyof typeof form, value: string) => {

    setForm((prev) => ({ ...prev, [key]: value }));

  };



  const toggleQueue = (name: string) => {

    setSelectedQueues((prev) => {

      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];

      if (typeof window !== 'undefined') {

        if (next.length > 0) {

          localStorage.setItem('selectedQueues', JSON.stringify(next));

        } else {

          localStorage.removeItem('selectedQueues');

        }

      }

      if (next.length === 0) {

        setToastMessage('Select at least one queue manager for backup.');

        setToastTone('error');

      }

      return next;

    });

  };



  const handleBackup = async () => {

    if (selectedQueues.length === 0) {

      setToastMessage('Select at least one queue manager for backup.');

      setToastTone('error');

      return;

    }



    setIsBackupStreaming(true);

    const transferType =

      form.transferMode === 'shared-sftp'

        ? 'SFTP'

        : form.transferMode === 'shared-scp'

          ? 'SCP'

          : null;

    const payload = {

      mqNames: selectedQueues,

      transferType,

    };



    try {

      const accessToken =

        typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch('http://192.168.18.35:8080/v1/backup', {

        method: 'POST',

        headers: {

          Accept: 'application/json',

          'Content-Type': 'application/json',

          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),

        },

        body: JSON.stringify(payload),

      });

      const responseText = await response.text();

      let data: unknown = null;



      try {

        data = responseText ? JSON.parse(responseText) : null;

      } catch (parseError) {

        console.warn('Backup response was not JSON:', parseError);

        data = null;

      }



      const responseRecord = data && typeof data === 'object' ? (data as {

        responseCode?: string;

        responseMsg?: string;

        message?: string;

      }) : null;

      const responseMsg = responseRecord?.responseMsg ? String(responseRecord.responseMsg) : '';

      const responseCode = responseRecord?.responseCode ? String(responseRecord.responseCode) : '';

      const isSuccess = responseMsg.toLowerCase() === 'success' || responseCode === '00';

      const message = responseRecord?.message

        ? String(responseRecord.message)

        : isSuccess

          ? 'Backup completed successfully.'

          : 'Backup failed.';



      if (isSuccess) {

        setToastMessage(message);

        setToastTone('success');

        setBackupDone(true);

        if (typeof window !== 'undefined') {

          localStorage.setItem('backupDone', 'true');

          localStorage.setItem('selectedQueues', JSON.stringify(selectedQueues));

        }

        setLogs((prev) => [

          `$ Backup started for: ${selectedQueues.join(', ')}`,

          `$ Transfer type: ${transferType ?? 'Local'}`,

          `$ ${message}`,

          ...prev.slice(3),

        ]);

        setShowBackupModal(true);

      } else {

        setToastMessage(message);

        setToastTone('error');

        setBackupDone(false);

        if (typeof window !== 'undefined') {

          localStorage.removeItem('backupDone');

        }

      }

    } catch (error) {

      setToastMessage('Backup failed.');

      setToastTone('error');

      setBackupDone(false);

      if (typeof window !== 'undefined') {

        localStorage.removeItem('backupDone');

      }

      console.error('Backup error:', error);

    } finally {

      setIsBackupStreaming(false);

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
      const response = await fetch('http://192.168.18.35:8080/v1/get-mq-details', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ mqName }),
      });
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

      setReportData(data as MqReportResponse);
      setReportExpanded({
        queue: true,
        subscription: true,
        channel: true,
        topic: true,
        service: true,
        channelAuth: true,
        listener: true,
        nameList: true,
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



  const hasSelection = selectedQueues.length > 0;

  const isBackupDisabled = isBackupStreaming || !hasSelection;

  const logLines = logs.length ? logs : ['Take MQ Backup to See the logs'];

  const isLogPlaceholder = logs.length === 0;

  const step1Done = Boolean(fieldsFilled);

  const step2Done = step1Done && connectionStatus === 'connected';

  const step3Done = step2Done && selectedQueues.length > 0;

  const step4Done = step3Done && backupDone;

  const requirementSteps = [

    { label: 'Provide MQ Server details', done: step1Done },

    { label: 'Test connection', done: step2Done },

    { label: 'Select Queue managers for backup', done: step3Done },

    { label: 'Backup', done: step4Done },

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



  const handleConnectToggle = async () => {

    const isDisconnecting = connectionStatus === 'connected';



    if (isDisconnecting) {

      setConnectionStatus('untested');

      if (typeof window !== 'undefined') {

        localStorage.removeItem('sourceConnected');

        localStorage.removeItem(sourceFormKey);

        localStorage.removeItem(sourceSftpKey);

        localStorage.removeItem(sourceScpKey);

        localStorage.removeItem('selectedQueues');

        setSelectedQueues([]);

      }

      return;

    }



    const isShared = form.transferMode === 'shared-sftp' || form.transferMode === 'shared-scp';

    const payload: {

      transferType: 'LOCAL' | 'shared';

      source: { server: string; user: string; password: string; backupPath: string };

      destination?: { server: string; user: string; password: string; backupPath: string };

    } = {

      transferType: isShared ? 'shared' : 'LOCAL',

      source: {

        server: form.server.trim(),

        user: form.username.trim(),

        password: form.password,

        backupPath: form.backupDir.trim(),

      },

    };



    if (form.transferMode === 'shared-sftp') {

      payload.destination = {

        server: sftpDetails.server.trim(),

        user: sftpDetails.username.trim(),

        password: sftpDetails.password,

        backupPath: sftpDetails.backupDir.trim(),

      };

    } else if (form.transferMode === 'shared-scp') {

      payload.destination = {

        server: scpDetails.server.trim(),

        user: scpDetails.username.trim(),

        password: scpDetails.password,

        backupPath: scpDetails.backupDir.trim(),

      };

    }



    console.log('Store server credentials request:', payload);



    try {

      const accessToken =

        typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch(

        'http://192.168.18.35:8080/v1/store-server-cred?calledFrom=source',

        {

          method: 'POST',

          headers: {

            Accept: 'application/json',

            'Content-Type': 'application/json',

            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),

          },

          body: JSON.stringify(payload),

        },

      );

      const responseText = await response.text();

      let data: unknown = null;



      try {

        data = responseText ? JSON.parse(responseText) : null;

      } catch (parseError) {

        console.warn('Store server credentials response was not JSON:', parseError);

        data = null;

      }



      console.log('Store server credentials response:', data);



      let isSuccess = false;

      let message = 'Connection not successful';



      if (data && typeof data === 'object') {

        const record = data as {

          responseCode?: string;

          responseMsg?: string;

          message?: string;

        };

        const responseCode = record.responseCode ? String(record.responseCode) : '';

        if (responseCode === '00') {

          isSuccess = true;

        }

        const responseMessage = record.message ?? record.responseMsg;

        if (responseMessage) {

          message = String(responseMessage);

        }

      }



      setToastMessage(message);

      setToastTone(isSuccess ? 'success' : 'error');

      if (isSuccess) {

        setConnectionStatus('connected');

        if (typeof window !== 'undefined') {

          localStorage.setItem('sourceConnected', 'true');

          localStorage.setItem(sourceFormKey, JSON.stringify(form));

          if (form.transferMode === 'shared-sftp') {

            localStorage.setItem(sourceSftpKey, JSON.stringify(sftpDetails));

            localStorage.removeItem(sourceScpKey);

          } else if (form.transferMode === 'shared-scp') {

            localStorage.setItem(sourceScpKey, JSON.stringify(scpDetails));

            localStorage.removeItem(sourceSftpKey);

          } else {

            localStorage.removeItem(sourceSftpKey);

            localStorage.removeItem(sourceScpKey);

          }

        }

      } else if (typeof window !== 'undefined') {

        localStorage.removeItem('sourceConnected');

        setConnectionStatus('untested');

      }

    } catch (error) {

      setConnectionStatus('untested');

      setToastMessage('Connection not successful');

      setToastTone('error');

      if (typeof window !== 'undefined') {

        localStorage.removeItem('sourceConnected');

      }

      console.error('Store server credentials error:', error);

    }

  };



  return (

    <div className="max-w-6xl mx-auto space-y-8">

      <div

        className={`bg-gray-50 border-0 shadow-none p-0 transition-transform duration-300 ${

          isTransitioning ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'

        }`}

      >

            <div className="flex items-start justify-between gap-4">

              <div>


                <h1 className="text-3xl font-bold text-gray-800">Source</h1>

                <p className="text-gray-600 mt-3">

              Connect to the source MQ server and take backups of selected Queue Managers.

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

                const isDone = step.done;

                const isCurrent = !isDone && currentRequirementIndex === idx;

                const pillClass = isDone

                  ? 'bg-black text-white'

                  : isCurrent

                    ? 'bg-gray-300 text-gray-700 animate-pulse'

                    : 'bg-gray-200 text-gray-600';

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

          {/* Source Connection Card */}

          <div

            ref={sourceFormRef}

            className={`rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm flex flex-col min-h-[520px] ${
              connectionStatus === 'connected' ? 'hidden' : ''
            }`}

          >

            <div className="mb-3">

              <span

                className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(0)}`}

              >

                Requirement 1: Provide MQ Server details

              </span>

            </div>

            <div className="flex items-start gap-2">

              <div className="flex-1">

                <p className="text-lg font-semibold text-gray-800">Source Connection</p>

                <p className="text-xs text-gray-500 mt-1">

                  Current MQ (production) - credentials are validated only; no data is migrated.

                </p>

              </div>

            </div>



            <div className="mt-4 space-y-4 flex-1">

              <div className="space-y-1">

                <label className="text-sm font-semibold text-gray-700">Source MQ Server</label>

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

                <label className="text-sm font-semibold text-gray-700">Source Backup Directory</label>

                <input

                  value={form.backupDir}

                  onChange={(e) => handleChange('backupDir', e.target.value)}

                  placeholder="/var/backups/mq-migrator/"

                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                />

              </div>



              <div className="space-y-1">

                <label className="text-sm font-semibold text-gray-700">Transfer Mode</label>

                <Select value={form.transferMode} onValueChange={(value) => handleChange('transferMode', value)}>

                  <SelectTrigger className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:border-gray-400 focus-visible:ring-2 focus-visible:ring-gray-300 *:data-[slot=select-value]:mx-auto *:data-[slot=select-value]:w-full *:data-[slot=select-value]:justify-center *:data-[slot=select-value]:text-center">

                    <SelectValue placeholder="Local" />

                  </SelectTrigger>

                  <SelectContent className="rounded-lg border border-gray-200 bg-white text-gray-800">

                    <SelectItem className="justify-center text-center" value="local">
                      Local
                    </SelectItem>
                    <SelectItem className="justify-center text-center" value="shared-sftp">
                      Shared SFTP
                    </SelectItem>
                    <SelectItem className="justify-center text-center" value="shared-scp">
                      Shared SCP
                    </SelectItem>
                  </SelectContent>

                </Select>

                <p className="text-xs text-gray-500">

                  Options: Local - Shared-SFTP - Shared-SCP

                </p>

              </div>



              {form.transferMode === 'shared-sftp' && (

                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">

                  <p className="text-sm font-semibold text-gray-800">SFTP Details</p>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">SFTP Server</label>

                      <input

                        value={sftpDetails.server}

                        onChange={(e) => setSftpDetails((prev) => ({ ...prev, server: e.target.value }))}

                        placeholder="sftp.example.com:22"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">Username</label>

                      <input

                        value={sftpDetails.username}

                        onChange={(e) => setSftpDetails((prev) => ({ ...prev, username: e.target.value }))}

                        placeholder="sftp-user"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">Password</label>

                      <input

                        type="password"

                        value={sftpDetails.password}

                        onChange={(e) => setSftpDetails((prev) => ({ ...prev, password: e.target.value }))}

                        placeholder="********"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">Target Backup Directory</label>

                      <input

                        value={sftpDetails.backupDir}

                        onChange={(e) => setSftpDetails((prev) => ({ ...prev, backupDir: e.target.value }))}

                        placeholder="/remote/backups/"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

                  </div>

                </div>

              )}



              {form.transferMode === 'shared-scp' && (

                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">

                  <p className="text-sm font-semibold text-gray-800">SCP Details</p>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">SCP Server</label>

                      <input

                        value={scpDetails.server}

                        onChange={(e) => setScpDetails((prev) => ({ ...prev, server: e.target.value }))}

                        placeholder="scp.example.com:22"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">Username</label>

                      <input

                        value={scpDetails.username}

                        onChange={(e) => setScpDetails((prev) => ({ ...prev, username: e.target.value }))}

                        placeholder="scp-user"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">Password</label>

                      <input

                        type="password"

                        value={scpDetails.password}

                        onChange={(e) => setScpDetails((prev) => ({ ...prev, password: e.target.value }))}

                        placeholder="********"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

                    <div className="space-y-1">

                      <label className="text-xs font-semibold text-gray-700">Target Backup Directory</label>

                      <input

                        value={scpDetails.backupDir}

                        onChange={(e) => setScpDetails((prev) => ({ ...prev, backupDir: e.target.value }))}

                        placeholder="/remote/backups/"

                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"

                      />

                    </div>

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

                Requirement 2: Test connection

              </span>

              <button

                type="button"

                onClick={handleConnectToggle}

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

            className={`rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm flex flex-col min-h-[520px] ${
              connectionStatus === 'connected' ? '' : 'hidden'
            }`}

          >

            <div className="mb-3">

              <span

                className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(2)}`}

              >

                Requirement 3: Select queue managers for backup

              </span>

            </div>

            <div className="flex flex-col gap-2 mb-4">

              <div className="flex-1 min-w-0">

                <p className="text-lg font-semibold text-gray-800">Queue Managers</p>

                <p className="text-xs text-gray-500 mt-1">

                  Select Queue Managers to back up. Click a row to view details.

                </p>

              </div>

            </div>



                {connectionStatus !== 'connected' ? (

                  <div className="flex-1 flex items-center justify-center text-gray-600 font-semibold bg-white border border-dashed border-gray-300 rounded-xl gap-2">

                    <ArrowLeft className="w-5 h-5 text-gray-500" />

                    Provide MQ Source Server Credentials

                  </div>

                ) : (

              <div className="flex-1 flex flex-col gap-4">

                <div className="space-y-2">

                  <div className="grid grid-cols-[1.6fr_1fr_0.7fr] text-xs font-semibold text-gray-500 px-3 py-2">

                    <span>Queue Manager</span>

                    <span>State</span>

                    <span className="text-right">Report</span>

                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">

                    {queueManagers.map((queue) => {

                      const checked = selectedQueues.includes(queue.name);

                      return (

                        <div

                          key={queue.name}

                              className="grid grid-cols-[1.6fr_1fr_0.7fr] items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 hover:border-gray-300"

                            >

                              <div className="flex items-center gap-2">

                                <input

                                  type="checkbox"

                                  checked={checked}

                                  onChange={() => toggleQueue(queue.name)}

                                  className="h-4 w-4 accent-gray-500"

                                />

                                <span>{queue.name}</span>

                              </div>

                              <div className="text-gray-600 text-sm">{queue.state || 'Unknown'}</div>

                              <button

                                type="button"

                                onClick={() => handleViewReport(queue.name)}
                                aria-label={`View report for ${queue.name}`}
                                className="text-gray-600 text-sm font-semibold text-right hover:text-gray-700"

                              >

                                View

                              </button>

                            </div>

                          );

                        })}

                      </div>

                    </div>



                    <div ref={backupActionRef} className="mt-auto">
                      <div className="mb-3">
                        <span
                          className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(3)}`}
                        >
                          Requirement 4: Backup
                        </span>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleConnectToggle}
                          className="flex-1 rounded-lg border border-red-500 px-6 py-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          Disconnect
                        </button>
                        <button
                          type="button"
                          disabled={isBackupDisabled}
                          onClick={handleBackup}
                          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-semibold shadow-sm ${
                            isBackupStreaming
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-black hover:bg-gray-900 text-white'
                          }`}
                        >
                          {isBackupStreaming ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CloudUpload className="w-4 h-4" />
                          )}
                          {isBackupStreaming ? 'Backing up...' : 'Backup'}
                        </button>
                      </div>
                    </div>

                  </div>

                )}

              </div>

         

          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm flex flex-col min-h-[520px] text-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold text-gray-800">Event Logs</p>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Refresh logs"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {logLines.map((line, idx) => (
                <div
                  key={`${line}-${idx}`}
                  className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2"
                >
                  <span className="text-[11px] text-gray-500 mt-1 font-semibold">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  {isLogPlaceholder ? (
                    <p className="text-gray-600 font-mono text-sm leading-6">{line}</p>
                  ) : (
                    <p className="text-emerald-600 font-mono text-sm leading-6">$ {line}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>



      {showBackupModal && (

        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">

          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">

            <h3 className="text-lg font-semibold text-gray-800">Backup Completed</h3>

            <p className="text-sm text-gray-700">

              The queue manager backup has been stored at{' '}

              <span className="font-semibold">{form.backupDir || 'specified directory'}</span>.

            </p>

            <div className="text-sm text-gray-700">

              <p className="font-semibold mb-1">Queue Managers:</p>

              <ul className="list-disc list-inside space-y-1">

                {(selectedQueues.length ? selectedQueues : ['None']).map((q) => (

                  <li key={q}>{q}</li>

                ))}

              </ul>

            </div>

            <div className="flex justify-end gap-3 pt-2">

              <button

                type="button"

                onClick={() => setShowBackupModal(false)}

                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold"

              >

                Stay on Source

              </button>

              <button

                type="button"

                onClick={() => router.push('/destination')}

                className="px-4 py-2 rounded-lg bg-black hover:bg-gray-900 text-white text-sm font-semibold"

              >

                Go to Destination

              </button>

            </div>

          </div>

        </div>

      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 py-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500">MQ Report</p>
                <p className="text-lg font-semibold text-gray-800">
                  {reportQueueName || 'Queue Manager'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={!reportData || reportLoading}
                  aria-label="Download MQ report"
                  className={`p-2 rounded-lg border text-sm font-semibold ${
                    reportData && !reportLoading
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            {reportLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading MQ report...
              </div>
            ) : reportError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {reportError}
              </div>
            ) : reportData ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 max-h-[60vh] overflow-y-auto space-y-3">
                {reportSections.map((section) => {
                  const sectionData = section.data;
                  const items = sectionData?.listOfObjects ?? [];
                  const isOpen = reportExpanded[section.key] ?? true;
                  return (
                    <div
                      key={section.key}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <button
                        type="button"
                        onClick={() => toggleReportSection(section.key)}
                        className="w-full flex items-center justify-between text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm font-semibold text-gray-800">
                          {section.label} ({getReportCount(sectionData)})
                        </span>
                        <span className="text-xs font-mono text-gray-500">
                          {isOpen ? '[-]' : '[+]'}
                        </span>
                      </button>
                      {isOpen && (
                        <ul className="mt-2 space-y-1 border-l border-gray-200 pl-4">
                          {items.length ? (
                            items.map((item) => (
                              <li
                                key={`${section.key}-${item.name}`}
                                className="flex items-start gap-2 text-xs text-gray-700"
                              >
                                <span className="font-mono">{item.name}</span>
                                {item.type ? (
                                  <span className="text-gray-500">[{item.type}]</span>
                                ) : null}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-gray-500">No entries.</li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                No report data loaded.
              </div>
            )}
          </div>
        </div>
      )}




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

