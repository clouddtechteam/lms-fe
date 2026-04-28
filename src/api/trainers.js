const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('lms_token')}`,
  'Content-Type': 'application/json'
});

export const getTrainers = async () => {
  const res = await fetch(`${BASE_URL}/trainers`, { headers: getHeaders() });
  return await res.json();
};

export const createTrainer = async (data) => {
  const res = await fetch(`${BASE_URL}/trainers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const importTrainers = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/trainers/import`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('lms_token')}` },
    body: formData
  });
  return await res.json();
};
