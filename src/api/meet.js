const BASE_URL = import.meta.env.VITE_API_URL || 'https://mc-lms-be.onrender.com/api';

const getHeaders = () => {
  const token = localStorage.getItem('lms_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const getMeetByBatch = async (batchId) => {
  const res = await fetch(`${BASE_URL}/meet/batch/${batchId}`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch meet details');
  return data;
};

export const getMyLiveClasses = async () => {
  const res = await fetch(`${BASE_URL}/meet/my-live-classes`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch live classes');
  return data;
};

export const createOrUpdateMeet = async (meetData) => {
  const res = await fetch(`${BASE_URL}/meet`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(meetData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save meet details');
  return data;
};

export const getSignature = async (meetingNumber, role) => {
  const res = await fetch(`${BASE_URL}/meet/signature`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ meetingNumber, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate signature');
  return data;
};

// Alias used by ZoomMeet component
export const getZoomSignature = getSignature;



export const getTrainerLiveClasses = async () => {
  const res = await fetch(`${BASE_URL}/meet/trainer-live-classes`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch trainer live classes');
  return data;
};

// ── Admin Cron API ──
export const getCronConfig = async () => {
  const res = await fetch(`${BASE_URL}/meet/cron/config`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch cron configuration');
  return data;
};

export const updateCronConfig = async (configData) => {
  const res = await fetch(`${BASE_URL}/meet/cron/config`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(configData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update cron configuration');
  return data;
};

export const triggerCronNow = async (batchIds = null) => {
  const res = await fetch(`${BASE_URL}/meet/cron/trigger-now`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ batchIds })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to trigger meeting generation');
  return data;
};
