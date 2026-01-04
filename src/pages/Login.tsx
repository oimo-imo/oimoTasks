import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        // Mock login handling
        navigate('/');
    };

    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="p-8 bg-white rounded-2xl shadow-lg w-full max-w-sm text-center">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Yururi Login</h1>
                <button
                    onClick={handleLogin}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
                >
                    Googleでログイン
                </button>
            </div>
        </div>
    );
};

export default Login;
