import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { X, Check, Lock, Loader2 } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { user, linkEmailAccount } = useStore();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    if (!isOpen) return null;

    // Check if user already has password provider linked
    const hasPasswordProvider = user?.providerData.some(p => p.providerId === 'password');

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setIsLoading(true);
        setMessage(null);

        try {
            await linkEmailAccount(password);
            setMessage({ type: 'success', text: 'パスワードを設定しました。次回からメールとパスワードでログインできます。' });
            setPassword('');
        } catch (err: any) {
            console.error(err);
            let msg = '設定に失敗しました。';
            if (err.code === 'auth/requires-recent-login') {
                msg = 'セキュリティのため、再ログインしてからもう一度お試しください。';
            } else if (err.code === 'auth/weak-password') {
                msg = 'パスワードは6文字以上にしてください。';
            } else if (err.code === 'auth/email-already-in-use') {
                msg = 'このメールアドレスは既に他のアカウントで使用されています。';
            } else if (err.code === 'auth/credential-already-in-use') {
                msg = 'この認証情報は既に他のユーザーに関連付けられています。';
            } else {
                msg = `エラー: ${err.message}`;
            }
            setMessage({ type: 'error', text: msg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">Settings</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Login Methods</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                                    <span className="text-sm font-medium text-gray-700">Google</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                                    <Check size={12} /> Connected
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Lock size={20} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">Email & Password</span>
                                </div>
                                {hasPasswordProvider ? (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                                        <Check size={12} /> Set
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded">
                                        Note Set
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {!hasPasswordProvider && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Set Password</h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Google認証に加え、メールアドレス ({user?.email}) とパスワードでもログインできるようにします。
                            </p>

                            {message && (
                                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleLink} className="space-y-3">
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-300 rounded-xl outline-none transition-all text-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                                    Set Password
                                </button>
                            </form>
                        </div>
                    )}

                    {hasPasswordProvider && (
                        <div className="text-center p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                            <p className="text-sm text-emerald-700">
                                メールアドレスとパスワードによるログインが有効です。<br />
                                <span className="text-xs opacity-75">変更するには一度ログアウトして「パスワードを忘れた場合」をご利用ください（未実装）。</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
