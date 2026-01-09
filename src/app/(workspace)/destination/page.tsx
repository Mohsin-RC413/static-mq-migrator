'use client';

import { ArrowLeft, CloudUpload, Loader2, RefreshCcw } from 'lucide-react';
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
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState<'success' | 'error' | ''>('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);
  const [isMigrateStreaming, setIsMigrateStreaming] = useState(false);
  const [destinationQueues, setDestinationQueues] = useState<QueueManager[]>([]);
  const [destinationSelectedQueues, setDestinationSelectedQueues] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [testDone, setTestDone] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
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
  const toastDurationMs = 3000;
  const toastFadeMs = 300;

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
    if (!isMigrateStreaming) return;
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
  }, [isMigrateStreaming]);

  const visibleQueues = useMemo(() => destinationQueues, [destinationQueues]);

  const statusChip =
    connectionStatus === 'connected'
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : 'bg-red-100 text-red-700 border border-red-200';

  const statusLabel = connectionStatus === 'connected' ? 'Connected' : 'Connection Not Tested';

  const hasSelection = destinationSelectedQueues.length > 0;
  const isReadyToMigrate = connectionStatus === 'connected' && hasSelection;
  const canMigrate = isReadyToMigrate && !isMigrateStreaming && !migrationDone;
  const step1Done = Boolean(destinationFieldsFilled);
  const step2Done = step1Done && (connectionStatus === 'connected' || testDone);
  const step3Done = destinationSelectedQueues.length > 0;
  const step4Done = step3Done && migrationDone;
  const logLines = logs.length ? logs : ['Migrate MQ to See the logs'];
  const isLogPlaceholder = logs.length === 0;
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
      localStorage.setItem('destinationTestDone', 'false');
      localStorage.setItem('destinationMigrationDone', 'false');
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
        localStorage.setItem(destinationQueuesKey, JSON.stringify(next));
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('destinationTestDone', 'false');
        localStorage.setItem(destinationConnectedKey, 'false');
        localStorage.removeItem(destinationQueuesKey);
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

      setToastMessage(message);
      setToastTone(isSuccess ? 'success' : 'error');
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
      setToastMessage('Connection not successful');
      setToastTone('error');
      if (typeof window !== 'undefined') {
        localStorage.setItem('destinationTestDone', 'false');
        localStorage.setItem(destinationConnectedKey, 'false');
      }
      console.error('Destination connection error:', error);
    }
  };

  const handleMigrate = async () => {
    if (connectionStatus !== 'connected' || isMigrateStreaming || migrationDone) {
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
      localStorage.setItem('destinationMigrationDone', 'false');
    }
    setIsMigrateStreaming(true);

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
        const migrateResponse = await fetch('http://192.168.18.35:8080/v1/migrate', {
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
          setToastMessage(message);
          setToastTone('success');
          setMigrationDone(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('destinationMigrationDone', 'true');
          }
          setLogs((prev) => [
            `$ Migration started for: ${destinationSelectedQueues.join(', ')}`,
            `$ ${message}`,
            '$ Waiting for next step...',
            ...prev.slice(3),
          ]);
        } else {
          setToastMessage(message);
          setToastTone('error');
          setMigrationDone(false);
          if (typeof window !== 'undefined') {
            localStorage.setItem('destinationMigrationDone', 'false');
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
      const azureLoginResponse = await fetch('http://192.168.18.35:8080/azure/login', {
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
      const aksCreateResponse = await fetch('http://192.168.18.35:8080/aks/create', {
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
        'http://192.168.18.35:8080/aks/get-credentials',
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
      const mqInstallResponse = await fetch('http://192.168.18.35:8080/mq/install', {
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
        mqscFilePath: `/MQMigratorBackup/backupfromsource/${selectedQueue}.mqsc`,
      };
      console.log('MQ load-mqsc request:', mqscPayload);
      const mqscResponse = await fetch('http://192.168.18.35:8080/mq/load-mqsc', {
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
        setToastMessage(mqscMessage);
        setToastTone('success');
        setMigrationDone(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('destinationMigrationDone', 'true');
        }
        setLogs((prev) => [
          `$ Migration started for: ${destinationSelectedQueues.join(', ')}`,
          `$ ${mqscMessage}`,
          '$ Waiting for next step...',
          ...prev.slice(3),
        ]);
      } else {
        setToastMessage(mqscMessage);
        setToastTone('error');
        setMigrationDone(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('destinationMigrationDone', 'false');
        }
      }
    } catch (error) {
      console.error('Migration error:', error);
      setToastMessage('Migration failed.');
      setToastTone('error');
      setMigrationDone(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('destinationMigrationDone', 'false');
      }
    } finally {
      setIsMigrateStreaming(false);
    }
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

  const handleDeploymentModeChange = (value: string) => {
    setDeploymentMode(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        destinationDropdownKey,
        JSON.stringify({ targetEnv, targetPlatform, computeModel, deploymentMode: value }),
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
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Destination Connection Card */}
          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm h-full flex flex-col">
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
                    onChange={(e) => handleDeploymentModeChange(e.target.value)}
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

            <div className="mt-6">
              <span
                className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 mb-3 ${getRequirementBadgeClass(1)}`}
              >
                Requirement 2: Test Connection
              </span>
              <div className="flex items-center justify-center">
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
              </div>
            </div>
          </div>

          {/* Queue Managers Card */}
          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6 shadow-sm">
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
                  {step2Done && (
                    <div className="mb-3">
                      <span
                        className={`inline-flex items-center rounded-full text-xs font-semibold px-3 py-1 ${getRequirementBadgeClass(3)}`}
                      >
                        Requirement 4: Migrate
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!canMigrate}
                    onClick={handleMigrate}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg w-full py-4 text-sm font-semibold shadow-sm ${
                      isMigrateStreaming
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : migrationDone
                          ? 'bg-black text-white cursor-not-allowed'
                          : isReadyToMigrate
                            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
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

      <div className="bg-neutral-900 text-gray-100 rounded-2xl border border-neutral-800 shadow-inner p-6 text-sm">
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
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {logLines.map((line, idx) => (
            <div
              key={`${line}-${idx}`}
              className="flex items-start gap-3 bg-neutral-950/60 border border-neutral-800 rounded-lg px-3 py-2"
            >
              <span className="text-[11px] text-neutral-500 mt-1 font-semibold">
                #{String(idx + 1).padStart(2, '0')}
              </span>
              {isLogPlaceholder ? (
                <p className="text-gray-400 font-mono text-sm leading-6">{line}</p>
              ) : (
                <p className="text-emerald-200 font-mono text-sm leading-6">$ {line}</p>
              )}
            </div>
          ))}
        </div>
      </div>

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
