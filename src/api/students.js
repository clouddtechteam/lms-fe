const BASE_URL = import.meta.env.VITE_API_URL || 'https://mc-lms-be.onrender.com/api';

const getHeaders = () => {
  const token = localStorage.getItem('lms_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const getStudents = async () => {
  const res = await fetch(`${BASE_URL}/students`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch students');
  return data;
};

export const createStudent = async (studentData) => {
  const res = await fetch(`${BASE_URL}/students`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(studentData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create student');
  return data;
};

export const importStudents = async (dataList) => {
  const res = await fetch(`${BASE_URL}/students/import`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dataList),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to import students');
  return data;
};

export const deleteStudent = async (id) => {
  const res = await fetch(`${BASE_URL}/students/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete student');
  return data;
};

export const updateStudent = async (id, studentData) => {
  const res = await fetch(`${BASE_URL}/students/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(studentData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update student');
  return data;
};

export const addSubscription = async (studentId, batchId) => {
  const res = await fetch(`${BASE_URL}/students/add-subscription`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ studentId, batchId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add subscription');
  return data;
};
