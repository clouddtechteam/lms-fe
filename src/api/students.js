const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('lms_token')}`,
  'Content-Type': 'application/json'
});

export const getStudents = async () => {
  const res = await fetch(`${BASE_URL}/students`, { headers: getHeaders() });
  return await res.json();
};

export const createStudent = async (data) => {
  const res = await fetch(`${BASE_URL}/students`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const importStudents = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/students/import`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('lms_token')}` },
    body: formData
  });
  return await res.json();
};

export const updateSubscription = async (studentId, subId, data) => {
  const res = await fetch(`${BASE_URL}/students/${studentId}/subscriptions/${subId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
};
