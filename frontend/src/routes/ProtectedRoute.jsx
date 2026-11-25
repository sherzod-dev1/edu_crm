import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getAccessToken } from '../utils/helpers/storage';

const ProtectedRoute = () => {
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  const token = getAccessToken();
  const location = useLocation();

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
