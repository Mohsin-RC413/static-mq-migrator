'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
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

export default function DestinationPage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected'>('untested');
  const [backupNotice, setBackupNotice] = useState<{ message: string; tone: 'success' | 'error' | '' }>({
    message: '',
    tone: '',
  });
  const [selectedQueues, setSelectedQueues] = useState<string[]>(['QMGR_PROD_A', 'QMGR_PROD_B']);
  const [activeQueue, setActiveQueue] = useState<string>('QMGR_PROD_A');
  const [logs, setLogs] = useState<string[]>([
    'Validating credentials for destination ... not tested',
    'Enumerating Queue Managers ... pending',
  ]);
  const [form, setForm] = useState({
    server: 'mq-dest-01.company.com:1414',
    username: 'root',
    password: '********',
    backupDir: '/var/backups/mq-migrator/',
  });

  const [targetEnv, setTargetEnv] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('');
  const [computeModel, setComputeModel] = useState('');
  const [deploymentMode, setDeploymentMode] = useState('');

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('destinationDropdowns');
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
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      'destinationDropdowns',
      JSON.stringify({ targetEnv, targetPlatform, computeModel, deploymentMode }),
    );
  }, [targetEnv, targetPlatform, computeModel, deploymentMode]);

  const activeQueueData = useMemo(
    () => QUEUES.find((q) => q.name === activeQueue) ?? QUEUES[0],
    [activeQueue],
  );

  const statusChip =
    connectionStatus === 'connected'
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : 'bg-red-100 text-red-700 border border-red-200';

  const statusLabel = connectionStatus === 'connected' ? 'Connected' : 'Connection Not Tested';

  const noticeClasses =
    backupNotice.tone === 'success'
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : backupNotice.tone === 'error'
        ? 'text-red-600 font-semibold whitespace-nowrap text-right'
        : '';
  const hasSelection = selectedQueues.length > 0;

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleQueue = (name: string) => {
    setSelectedQueues((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
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

  const handleTestConnection = () => {
    setConnectionStatus('connected');
    setBackupNotice({ message: '', tone: '' });
    setLogs((prev) => [
      `$ Validating credentials for ${form.server} ... OK`,
      '$ Enumerating Queue Managers ... 4 found',
      `$ Selected: ${selectedQueues.join(', ') || 'None selected'}`,
      '$ Waiting for backup. Click "Backup" to start...',
      ...prev.slice(3),
    ]);
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
    setLogs((prev) => [
      `$ Backup started for: ${selectedQueues.join(', ')}`,
      `$ Writing backup to: ${targetDir}`,
      '$ Backup complete (simulated preview).',
      ...prev.slice(3),
    ]);
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-gray-50 border-0 shadow-none p-0">
        <div className="mb-4">
          <Image src={logo} alt="Royal Cyber" className="h-16 w-auto" priority />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">Migration</p>
            <h1 className="text-3xl font-bold text-gray-800">Destination</h1>
            <p className="text-gray-600 mt-3">
              Connect to the destination MQ server and configure deployment settings before backup.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Destination Connection Card */}
          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm h-full flex flex-col">
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
                  <select
                    value={targetEnv}
                    onChange={(e) => resetPlatformAndBelow(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                  >
                    <option value="">Select environment</option>
                    <option value="VM">VM</option>
                    <option value="Host Systems">Host Systems</option>
                    <option value="Cloud">Cloud</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Target Platform</label>
                  <select
                    value={targetPlatform}
                    onChange={(e) => resetComputeAndBelow(e.target.value)}
                    disabled={!targetEnv}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
                  >
                    <option value="">Select platform</option>
                    {platformOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Compute Model</label>
                  <select
                    value={computeModel}
                    onChange={(e) => resetDeployment(e.target.value)}
                    disabled={!computeOptions.length}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
                  >
                    <option value="">Select compute model</option>
                    {computeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Deployment Mode</label>
                  <select
                    value={deploymentMode}
                    onChange={(e) => setDeploymentMode(e.target.value)}
                    disabled={!deploymentOptions.length}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
                  >
                    <option value="">Select deployment mode</option>
                    {deploymentOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Destination MQ Server</label>
                <input
                  value={form.server}
                  onChange={(e) => handleChange('server', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Username</label>
                  <input
                    value={form.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Target Backup Directory</label>
                <input
                  value={form.backupDir}
                  onChange={(e) => handleChange('backupDir', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
                />
              </div>

            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleTestConnection}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 text-sm font-semibold shadow-sm"
              >
                Test Connection
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 text-sm font-semibold shadow-sm"
              >
                Next
              </button>
              <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${statusChip}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Queue Managers Card */}
          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm">
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

            <div className="space-y-2">
              <div className="grid grid-cols-[1.6fr_1fr_0.7fr] text-xs font-semibold text-gray-500 px-3 py-2">
                <span>Queue Manager</span>
                <span>Last Backup</span>
                <span className="text-right">Report</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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

            <div className="mt-6 rounded-xl bg-white border border-gray-200 p-4 text-sm text-gray-700">
              <p className="font-semibold text-gray-800 mb-2">Details - {activeQueueData.name}</p>
              <div className="grid sm:grid-cols-2 gap-3 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Version</span>
                  <span>{activeQueueData.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform</span>
                  <span>{activeQueueData.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Channels</span>
                  <span>{activeQueueData.channels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Queues</span>
                  <span>{activeQueueData.queues}</span>
                </div>
                <div className="flex justify-between sm:col-span-2">
                  <span className="text-gray-500">Security</span>
                  <span>{activeQueueData.security}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!hasSelection}
                  onClick={handleBackup}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-sm ${
                    hasSelection
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 text-gray-100 rounded-2xl border border-neutral-800 shadow-inner p-6 text-sm">
        <p className="font-semibold text-white mb-3">Event Logs</p>
        <div className="space-y-1 font-mono text-[13px] leading-6 text-emerald-300">
          {logs.map((line, idx) => (
            <div key={`${line}-${idx}`} className="text-emerald-300">
              $ {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
