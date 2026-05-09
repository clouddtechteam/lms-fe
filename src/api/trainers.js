const BASE_URL = import.meta.env.VITE_API_URL || 'https://mc-lms-be.onrender.com/api';

const getHeaders = () => {
  const token = localStorage.getItem('lms_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const getTrainers = async () => {
  const res = await fetch(`${BASE_URL}/trainers`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch trainers');
  return data;
};

export const createTrainer = async (trainerData) => {
  const res = await fetch(`${BASE_URL}/trainers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(trainerData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create trainer');
  return data;
};

export const importTrainers = async (dataList) => {
  const res = await fetch(`${BASE_URL}/trainers/import`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dataList),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to import trainers');
  return data;
};

export const updateTrainer = async (id, trainerData) => {
  const res = await fetch(`${BASE_URL}/trainers/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(trainerData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update trainer');
  return data;
};

export const deleteTrainer = async (id) => {
  const res = await fetch(`${BASE_URL}/trainers/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete trainer');
  return data;
};
