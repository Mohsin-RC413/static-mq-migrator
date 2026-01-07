'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Link2, ArrowLeft, CloudUpload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import logo from '../../../assets/c1e60e7780162b6f7a1ab33de09eea29e15bc73b.png';

type Status = 'ready' | 'warning';
type QueueManager = {
  name: string;
  status: Status;
  lastBackup: string;
  report: string;
  version: string;
  platform: string;
  channels: string;
  queues: string;
  security: string;
};

const QUEUES: QueueManager[] = [
  {
    name: 'QMGR_PROD_A',
    status: 'ready',
    lastBackup: '—',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '42 defined - 3 stopped',
    queues: '1,284 local - 17 remote',
    security: 'CHLAUTH enabled - TLS required',
  },
  {
    name: 'QMGR_PROD_B',
    status: 'ready',
    lastBackup: 'Today 09:12',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '38 defined - 2 stopped',
    queues: '1,102 local - 14 remote',
    security: 'CHLAUTH enabled - TLS required',
  },
  {
    name: 'QMGR_PAYMENTS',
    status: 'warning',
    lastBackup: 'Yesterday',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '42 defined - 3 stopped',
    queues: '1,284 local - 17 remote',
    security: 'CHLAUTH enabled - TLS required - error',
  },
  {
    name: 'QMGR_ANALYTICS',
    status: 'ready',
    lastBackup: '—',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '30 defined - 1 stopped',
    queues: '856 local - 9 remote',
    security: 'CHLAUTH enabled - TLS required',
  },
  {
    name: 'QMGR_DR',
    status: 'ready',
    lastBackup: '—',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '28 defined - 1 stopped',
    queues: '612 local - 8 remote',
    security: 'CHLAUTH enabled - TLS required',
  },
  {
    name: 'QMGR_ARCHIVE',
    status: 'ready',
    lastBackup: '—',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '22 defined - 0 stopped',
    queues: '420 local - 5 remote',
    security: 'CHLAUTH enabled - TLS required',
  },
  {
    name: 'QMGR_TEST',
    status: 'warning',
    lastBackup: 'Last week',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '18 defined - 2 stopped',
    queues: '380 local - 4 remote',
    security: 'CHLAUTH enabled - TLS required - error',
  },
  {
    name: 'QMGR_BATCH',
    status: 'ready',
    lastBackup: '—',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '25 defined - 1 stopped',
    queues: '512 local - 6 remote',
    security: 'CHLAUTH enabled - TLS required',
  },
  {
    name: 'QMGR_EDGE',
    status: 'ready',
    lastBackup: 'Yesterday',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '30 defined - 1 stopped',
    queues: '744 local - 9 remote',
    security: 'CHLAUTH enabled - TLS required',
  },
  {
    name: 'QMGR_EVENTS',
    status: 'warning',
    lastBackup: 'Today 07:10',
    report: 'View',
    version: 'IBM MQ 9.3.2',
    platform: 'RHEL 8 (VMware)',
    channels: '20 defined - 0 stopped',
    queues: '590 local - 7 remote',
    security: 'CHLAUTH enabled - TLS required - error',
  },
];

export default function SourcePage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected'>('untested');
  const [backupNotice, setBackupNotice] = useState<{ message: string; tone: 'success' | 'error' | '' }>({
    message: '',
    tone: '',
  });
  const [backupDone, setBackupDone] = useState(false);
  const [testDone, setTestDone] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const [activeQueue, setActiveQueue] = useState<string>('QMGR_PROD_A');
  const [logs, setLogs] = useState<string[]>([
    'Validating credentials for mq-prod-01.company.com:1414 ... not tested',
    'Enumerating Queue Managers ... pending',
    'Queued request for channel sync ... pending',
    'Fetching TLS cert metadata ... pending',
    'Preparing backup directory ... pending',
  ]);
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
  const sourceFormKey = 'sourceForm';
  const sourceSftpKey = 'sourceSftp';
  const sourceScpKey = 'sourceScp';
  const [isTransitioning] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const router = useRouter();

  const resetProgress = () => {
    setConnectionStatus('untested');
    setBackupDone(false);
    setTestDone(false);
    setMigrationDone(false);
    setSelectedQueues([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('backupDone', 'false');
      localStorage.setItem('testDone', 'false');
      localStorage.setItem('migrationDone', 'false');
      localStorage.setItem('sourceConnected', 'false');
      localStorage.setItem('selectedQueues', JSON.stringify([]));
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('backupDone');
    const storedTest = localStorage.getItem('testDone');
    const storedMigration = localStorage.getItem('migrationDone');
    const storedConnected = localStorage.getItem('sourceConnected');
    const storedSelected = localStorage.getItem('selectedQueues');
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
  }, []);

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

  const activeQueueData = useMemo(
    () => QUEUES.find((q) => q.name === activeQueue) ?? QUEUES[0],
    [activeQueue],
  );

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
        localStorage.setItem('selectedQueues', JSON.stringify(next));
      }
      if (next.length === 0) {
        setBackupNotice({
          message: '* Select at least one queue manager for backup.',
          tone: 'error',
        });
      } else if (backupNotice.tone === 'error') {
        setBackupNotice({ message: '', tone: '' });
      }
      return next;
    });
  };

  const viewQueue = (name: string) => {
    setActiveQueue(name);
  };

  const handleBackup = () => {
    if (selectedQueues.length === 0) {
      setBackupNotice({
        message: '* Select at least one queue manager for backup.',
        tone: 'error',
      });
      return;
    }

    const targetDir = form.backupDir || 'specified directory';
    setBackupNotice({
      message: `Backup stored at ${targetDir}`,
      tone: 'success',
    });
    setBackupDone(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('backupDone', 'true');
      localStorage.setItem('selectedQueues', JSON.stringify(selectedQueues));
    }
    setLogs((prev) => [
      `$ Backup started for: ${selectedQueues.join(', ')}`,
      `$ Writing backup to: ${targetDir}`,
      '$ Backup complete (simulated preview).',
      ...prev.slice(3),
    ]);
    setShowBackupModal(true);
  };

  const noticeClasses =
    backupNotice.tone === 'success'
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : backupNotice.tone === 'error'
        ? 'text-red-600 font-semibold whitespace-nowrap text-right'
        : '';
  const hasSelection = selectedQueues.length > 0;
  const requirementSteps = [
    {
      label: 'Provide MQ Server details',
      done: Boolean(fieldsFilled) || backupDone || testDone || connectionStatus === 'connected',
    },
    { label: 'Test connection', done: connectionStatus === 'connected' || testDone || backupDone },
    { label: 'Select Queue managers for backup', done: selectedQueues.length > 0 || backupDone },
    { label: 'Backup', done: backupDone },
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

  const handleConnectToggle = () => {
    const nextStatus = connectionStatus === 'connected' ? 'untested' : 'connected';
    setConnectionStatus(nextStatus);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sourceConnected', nextStatus === 'connected' ? 'true' : 'false');
      if (nextStatus === 'connected') {
        localStorage.setItem(sourceFormKey, JSON.stringify(form));
        localStorage.setItem(sourceSftpKey, JSON.stringify(sftpDetails));
        localStorage.setItem(sourceScpKey, JSON.stringify(scpDetails));
      } else {
        localStorage.removeItem(sourceFormKey);
        localStorage.removeItem(sourceSftpKey);
        localStorage.removeItem(sourceScpKey);
        localStorage.setItem('selectedQueues', JSON.stringify([]));
        setSelectedQueues([]);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div
        className={`bg-gray-50 border-0 shadow-none p-0 transition-transform duration-300 ${
          isTransitioning ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="mb-4">
          <Image src={logo} alt="Royal Cyber" className="h-16 w-auto" priority />
        </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">Migration</p>
                <h1 className="text-3xl font-bold text-gray-800">Source</h1>
                <p className="text-gray-600 mt-3">
              Connect to the source MQ server and take backups of selected Queue Managers.
            </p>
          </div>
        </div>

        {/* Progress checkpoints */}
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-700">Progress</div>
            <button
              type="button"
              onClick={resetProgress}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Reset
            </button>
        </div>
          <div className="relative">
            <div className="absolute left-6 right-6 top-4 h-px bg-gray-200" />
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
      </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Source Connection Card */}
          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm flex flex-col min-h-[520px]">
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
                    placeholder="••••••••"
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
                <select
                  value={form.transferMode}
                  onChange={(e) => handleChange('transferMode', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                >
                  <option value="local">Local</option>
                  <option value="shared-sftp">Shared SFTP</option>
                  <option value="shared-scp">Shared SCP</option>
                </select>
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
                        placeholder="••••••••"
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
                        placeholder="••••••••"
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

            <div className="mt-6">
              <span
                className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 mb-3 ${getRequirementBadgeClass(1)}`}
              >
                Requirement 2: Test connection
              </span>
              <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleConnectToggle}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-sm ${
                  connectionStatus === 'connected'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                <Link2 className="w-4 h-4" />
                {connectionStatus === 'connected' ? 'Disconnect' : 'Connect'}
              </button>
              <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${statusChip}`}>
                {statusLabel}
              </span>
              </div>
            </div>
          </div>

          {/* Queue Managers Card */}
          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm flex flex-col min-h-[520px]">
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
              {backupNotice.message && (
                <div className="text-xs font-semibold text-right">
                  <span className={`inline-block px-3 py-1 rounded-full ${noticeClasses}`}>
                    {backupNotice.message}
                  </span>
                </div>
              )}
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
                    <span>Last Backup</span>
                    <span className="text-right">Report</span>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {QUEUES.map((queue) => {
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
                              <div className="text-gray-600 text-sm">{queue.lastBackup}</div>
                              <button
                                type="button"
                                onClick={() => viewQueue(queue.name)}
                                className="text-gray-600 text-sm font-semibold text-right hover:text-gray-700"
                              >
                                {queue.report}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="mb-3">
                        <span
                          className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(3)}`}
                        >
                          Requirement 4: Backup
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!hasSelection}
                        onClick={handleBackup}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg w-full py-4 text-sm font-semibold shadow-sm ${
                          hasSelection
                            ? 'bg-black hover:bg-gray-900 text-white'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        <CloudUpload className="w-4 h-4" />
                        Backup
                      </button>
                    </div>
                  </div>
                )}
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

      <div className="bg-neutral-900 text-gray-100 rounded-2xl border border-neutral-800 shadow-inner p-6 text-sm">
        <p className="font-semibold text-white mb-3">Event Logs</p>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {logs.map((line, idx) => (
            <div
              key={`${line}-${idx}`}
              className="flex items-start gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2"
            >
              <span className="text-[11px] text-neutral-500 mt-1 font-semibold">
                #{String(idx + 1).padStart(2, '0')}
              </span>
              <p className="text-emerald-200 font-mono text-sm leading-6">$ {line}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
