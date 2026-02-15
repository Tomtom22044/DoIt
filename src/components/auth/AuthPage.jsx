import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import styles from './AuthPage.module.css';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password, name);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* Background Assets */}
            <div className={styles.backgroundOverlay} />
            <div className={styles.glowContainer}>
                <div className={`${styles.glowCircle} ${styles.glow1}`} />
                <div className={`${styles.glowCircle} ${styles.glow2}`} />
            </div>

            <div className={`${styles.authCard} animate-scale-in`}>
                <div className={styles.header}>
                    <div className={styles.logoIconWrapper}>
                        {isLogin ? <LogIn size={32} /> : <Sparkles size={32} />}
                    </div>
                    <h1>TaskPoint</h1>
                    <p>{isLogin ? 'התחברות למערכת המשימות' : 'הצטרפו לקהילת המשימות שלנו'}</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>שם מלא</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={styles.input}
                                    placeholder="ישראל ישראלי"
                                />
                                <User className={styles.inputIcon} size={18} />
                            </div>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>אימייל</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={styles.input}
                                placeholder="your@email.com"
                            />
                            <Mail className={styles.inputIcon} size={18} />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>סיסמה</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.input}
                                placeholder="••••••••"
                            />
                            <Lock className={styles.inputIcon} size={18} />
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.submitBtn}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'התחברות' : 'הרשמה'}
                                <ArrowRight className="rotate-180" size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className={styles.footer}>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className={styles.toggleBtn}
                    >
                        {isLogin ? 'אין לכם חשבון? הירשמו כאן' : 'כבר יש לכם חשבון? התחברו כאן'}
                    </button>
                </div>
            </div>
        </div>
    );
}
