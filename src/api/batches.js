const BASE_URL = import.meta.env.VITE_API_URL || 'https://mc-lms-be.onrender.com/api';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('lms_token')}`,
  'Content-Type': 'application/json'
});

export const getBatches = async () => {
  const res = await fetch(`${BASE_URL}/batches`, { headers: getHeaders() });
  return await res.json();
};

export const createBatch = async (data) => {
  const res = await fetch(`${BASE_URL}/batches`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const importBatches = async (data) => {
  const res = await fetch(`${BASE_URL}/batches/import`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ data })
  });
  return await res.json();
};

export const deleteBatch = async (id) => {
  const res = await fetch(`${BASE_URL}/batches/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return await res.json();
};

export const getBatchDetails = async (id) => {
  const res = await fetch(`${BASE_URL}/batches/${id}/details`, { headers: getHeaders() });
  return await res.json();
};
