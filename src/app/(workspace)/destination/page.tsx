'use client';

import { ArrowLeft, CloudUpload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import logo from '../../../assets/c1e60e7780162b6f7a1ab33de09eea29e15bc73b.png';

type QueueManager = {
  name: string;
  state?: string;
};

export default function DestinationPage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected'>('untested');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [destinationQueues, setDestinationQueues] = useState<QueueManager[]>([]);
  const [backupNotice, setBackupNotice] = useState<{ message: string; tone: 'success' | 'error' | '' }>({
    message: '',
    tone: '',
  });
  const [destinationSelectedQueues, setDestinationSelectedQueues] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([
    'Validating credentials for destination ... not tested',
    'Enumerating Queue Managers ... pending',
    'Queued request for channel sync ... pending',
    'Fetching TLS cert metadata ... pending',
    'Preparing backup directory ... pending',
  ]);
  const [testDone, setTestDone] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const router = useRouter();
  const destinationFormKey = 'destinationForm';
  const destinationDropdownKey = 'destinationDropdowns';
  const destinationQueuesKey = 'destinationSelectedQueues';
  const destinationConnectedKey = 'destinationConnected';
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
    (targetEnv !== 'Cloud' || (computeModel.trim() && deploymentMode.trim())) &&
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
    }
  }, []);

  const visibleQueues = useMemo(() => destinationQueues, [destinationQueues]);

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
  const hasSelection = destinationSelectedQueues.length > 0;
  const canMigrate = connectionStatus === 'connected' && hasSelection;

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetProgress = () => {
    setConnectionStatus('untested');
    setConnectionMessage('');
    setTestDone(false);
    setMigrationDone(false);
    setDestinationSelectedQueues([]);
    setDestinationQueues([]);
    setBackupNotice({ message: '', tone: '' });
    setShowMigrationModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('destinationTestDone', 'false');
      localStorage.setItem('destinationMigrationDone', 'false');
    }
  };

  const toggleDestinationQueue = (name: string) => {
    setDestinationSelectedQueues((prev) => {
      const next = prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name];
      if (next.length === 0) {
        setBackupNotice({
          message: '* Select at least one queue manager for migration.',
          tone: 'error',
        });
      } else if (backupNotice.tone === 'error') {
        setBackupNotice({ message: '', tone: '' });
      }
      if (typeof window !== 'undefined' && connectionStatus === 'connected') {
        localStorage.setItem(destinationQueuesKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleTestConnection = async () => {
    if (connectionStatus === 'connected') {
      setConnectionStatus('untested');
      setConnectionMessage('');
      setTestDone(false);
      setDestinationSelectedQueues([]);
      setDestinationQueues([]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('destinationTestDone', 'false');
        localStorage.setItem(destinationConnectedKey, 'false');
        localStorage.removeItem(destinationQueuesKey);
      }
      return;
    }

    setBackupNotice({ message: '', tone: '' });
    setConnectionMessage('');

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
        setConnectionMessage('Missing access token. Please log in again.');
        if (typeof window !== 'undefined') {
          localStorage.setItem('destinationTestDone', 'false');
          localStorage.setItem(destinationConnectedKey, 'false');
        }
        return;
      }
      const response = await fetch(
        isCloud
          ? 'http://192.168.18.35:8080/azure/login'
          : 'http://192.168.18.35:8080/v1/store-server-cred?calledFrom=destination',
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

      setConnectionMessage(message);
      if (isSuccess) {
        setConnectionStatus('connected');
        setTestDone(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('destinationTestDone', 'true');
          localStorage.setItem(destinationConnectedKey, 'true');
          localStorage.setItem(destinationQueuesKey, JSON.stringify(destinationSelectedQueues));
        }
        const logTarget = isCloud ? `${targetEnv} ${targetPlatform}` : form.server;
        setLogs((prev) => [
          `$ Validating credentials for ${logTarget || 'destination'} ... OK`,
          '$ Enumerating Queue Managers ... 4 found',
          `$ Selected: ${destinationSelectedQueues.join(', ') || 'None selected'}`,
          '$ Waiting for migration. Click "Migrate" to start...',
          ...prev.slice(3),
        ]);
      } else {
        setConnectionStatus('untested');
        setTestDone(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('destinationTestDone', 'false');
          localStorage.setItem(destinationConnectedKey, 'false');
        }
      }
    } catch (error) {
      setConnectionStatus('untested');
      setTestDone(false);
      setConnectionMessage('Connection not successful');
      if (typeof window !== 'undefined') {
        localStorage.setItem('destinationTestDone', 'false');
        localStorage.setItem(destinationConnectedKey, 'false');
      }
      console.error('Destination connection error:', error);
    }
  };

  const handleMigrate = () => {
    if (connectionStatus !== 'connected') {
      return;
    }
    if (destinationSelectedQueues.length === 0) {
      setBackupNotice({
        message: '* Select at least one queue manager for migration.',
        tone: 'error',
      });
      return;
    }
    setBackupNotice({ message: '', tone: '' });
    setShowMigrationModal(true);
  };

  const confirmMigration = () => {
    const targetDir = form.backupDir || 'specified directory';
    setShowMigrationModal(false);
    setBackupNotice({
      message: `Migration stored at ${targetDir}`,
      tone: 'success',
    });
    setMigrationDone(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('destinationMigrationDone', 'true');
    }
    setLogs((prev) => [
      `$ Migration started for: ${destinationSelectedQueues.join(', ')}`,
      `$ Writing migration artifacts to: ${targetDir}`,
      '$ Migration complete (simulated preview).',
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
        const response = await fetch(
          'http://192.168.18.35:8080/v1/destination/mq/list',
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
              const record = item as { name?: string; state?: string };
              if (!record.name) {
                return null;
              }
              return {
                name: String(record.name),
                state: record.state ? String(record.state) : undefined,
              };
            })
            .filter(Boolean) as QueueManager[];
          setDestinationQueues(mapped);
          setDestinationSelectedQueues((prev) =>
            prev.filter((name) => mapped.some((queue) => queue.name === name)),
          );
        } else {
          setDestinationQueues([]);
        }
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          console.error('Destination MQ list error:', error);
        }
      }
    };

    fetchDestinationQueues();

    return () => controller.abort();
  }, [connectionStatus]);

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
              {(() => {
                const steps = [
                  { label: 'Provide Destination connection credentials', done: Boolean(destinationFieldsFilled) },
                  { label: 'Test connection', done: connectionStatus === 'connected' || testDone },
                  { label: 'Select queue managers for migration', done: destinationSelectedQueues.length > 0 },
                  { label: 'Migrate', done: migrationDone },
                ];
                const currentIdx = steps.findIndex((s) => !s.done);

                return steps.map((step, idx) => {
                  const isDone = step.done;
                  const isCurrent = !isDone && idx === currentIdx;
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
                });
              })()}
            </div>
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

              {targetEnv !== 'Cloud' ? (
                <>
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

            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleTestConnection}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold shadow-sm ${
                  connectionStatus === 'connected'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {connectionStatus === 'connected' ? 'Disconnect' : 'Test Connection'}
              </button>
              {connectionMessage ? (
                <span className="text-xs font-semibold text-gray-600">{connectionMessage}</span>
              ) : null}
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
                  Select Queue Managers for migration.
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
              <div className="flex-1 flex items-center justify-center text-gray-600 font-semibold bg-white border border-dashed border-gray-300 rounded-xl gap-2 min-h-[240px]">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
                Test destination connection to load queue managers.
              </div>
            ) : visibleQueues.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-600 font-semibold bg-white border border-dashed border-gray-300 rounded-xl gap-2 min-h-[240px]">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
                No queue managers available.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1.6fr_1fr_0.7fr] text-xs font-semibold text-gray-500 px-3 py-2">
                    <span>Queue Manager</span>
                    <span>State</span>
                    <span className="text-right">Report</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {visibleQueues.map((queue) => (
                      <div
                        key={queue.name}
                        className="grid grid-cols-[1.6fr_1fr_0.7fr] items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 hover:border-gray-300"
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
                        <div className="text-gray-600 text-sm">{queue.state || 'Unknown'}</div>
                        <button
                          type="button"
                          className="text-gray-600 text-sm font-semibold text-right hover:text-gray-700"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    disabled={!canMigrate}
                    onClick={handleMigrate}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg w-full py-4 text-sm font-semibold shadow-sm ${
                      canMigrate ? 'bg-black hover:bg-gray-900 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <CloudUpload className="w-4 h-4" />
                    Migrate
                  </button>
                </div>
              </>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => router.push('/source')}
                className="inline-flex items-center justify-center gap-2 rounded-lg w-full py-3 text-sm font-semibold shadow-sm bg-black hover:bg-gray-900 text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Go to Source
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMigrationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Confirm Migration</h3>
            <p className="text-sm text-gray-700">
              You are about to migrate the selected queue managers to the destination environment.
            </p>
            <p className="text-sm text-gray-700">
              Migration output: <span className="font-semibold">{form.backupDir || 'specified directory'}</span>
            </p>
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Queue Managers:</p>
              <ul className="list-disc list-inside space-y-1">
                {destinationSelectedQueues.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMigrationModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMigration}
                className="px-4 py-2 rounded-lg bg-black hover:bg-gray-900 text-white text-sm font-semibold"
              >
                Yes, Migrate
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
