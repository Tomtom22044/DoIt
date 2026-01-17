import { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Plus, Check, Zap, Dumbbell, Book, Droplet, Coffee, Utensils, Smile, Pencil, Trash2, X, Save } from 'lucide-react';
import styles from './Activities.module.css';

const ICONS = {
    zap: Zap,
    dumbbell: Dumbbell,
    book: Book,
    droplet: Droplet,
    coffee: Coffee,
    utensils: Utensils,
    smile: Smile,
};

export default function Activities() {
    const { activities, performActivity, addActivity, updateActivity, deleteActivity } = useStorage();
    const [isAdding, setIsAdding] = useState(false);
    const [newActivity, setNewActivity] = useState({ name: '', value: 10, icon: 'zap' });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [animatingId, setAnimatingId] = useState(null);

    const handlePerform = (activity) => {
        if (editingId) return; // Disable perform while editing
        performActivity(activity);
        setAnimatingId(activity.id);
        setTimeout(() => setAnimatingId(null), 500);
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (!newActivity.name) return;
        addActivity({ ...newActivity });
        setIsAdding(false);
        setNewActivity({ name: '', value: 10, icon: 'zap' });
    };

    const startEdit = (e, activity) => {
        e.stopPropagation();
        setEditingId(activity.id);
        setEditData({ ...activity });
        setIsAdding(false);
    };

    const cancelEdit = (e) => {
        if (e) e.stopPropagation();
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = (e) => {
        e.stopPropagation();
        if (!editData.name) return;
        updateActivity(editData.id, editData);
        setEditingId(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (window.confirm('האם למחוק פעילות זו?')) {
            deleteActivity(id);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.list}>
                {activities.map(activity => {
                    const isEditing = editingId === activity.id;
                    const Icon = ICONS[activity.icon] || Zap;
                    const isAnimating = animatingId === activity.id;

                    if (isEditing) {
                        return (
                            <div key={activity.id} className={styles.editCard}>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    className={styles.input}
                                    autoFocus
                                    placeholder="שם הפעילות"
                                />
                                <div className={styles.editRow}>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editData.value}
                                        onChange={e => setEditData({ ...editData, value: Number(e.target.value) })}
                                        className={styles.input}
                                        style={{ width: '80px' }}
                                    />
                                    <div className={styles.editActions}>
                                        <Button size="sm" variant="secondary" onClick={cancelEdit}>
                                            <X size={18} />
                                        </Button>
                                        <Button size="sm" variant="primary" onClick={saveEdit}>
                                            <Save size={18} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <Card
                            key={activity.id}
                            className={`${styles.activityCard} ${isAnimating ? styles.success : ''}`}
                            onClick={() => handlePerform(activity)}
                        >
                            <div className={styles.activityIconWrapper}>
                                {isAnimating ? <Check size={24} /> : <Icon size={24} />}
                            </div>
                            <div className={styles.activityInfo}>
                                <h3 className={styles.activityName}>{activity.name}</h3>
                                <span className={styles.activityValue}>+{activity.value} נק׳</span>
                            </div>

                            <div className={styles.cardActions}>
                                <button
                                    className={styles.actionButton}
                                    onClick={(e) => startEdit(e, activity)}
                                    title="ערוך"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={(e) => handleDelete(e, activity.id)}
                                    title="מחק"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className={styles.addSection}>
                {!isAdding ? (
                    <Button
                        className={styles.addButton}
                        variant="outline"
                        fullWidth
                        onClick={() => setIsAdding(true)}
                        disabled={!!editingId} // Disable adding while editing another
                    >
                        <Plus size={18} /> הוסף פעילות חדשה
                    </Button>
                ) : (
                    <form className={styles.addForm} onSubmit={handleAddSubmit}>
                        <h3>פעילות חדשה</h3>
                        <input
                            type="text"
                            placeholder="שם הפעילות"
                            value={newActivity.name}
                            onChange={e => setNewActivity({ ...newActivity, name: e.target.value })}
                            className={styles.input}
                            autoFocus
                        />
                        <div className={styles.row}>
                            <div className={styles.inputGroup}>
                                <label>נקודות</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newActivity.value}
                                    onChange={e => setNewActivity({ ...newActivity, value: Number(e.target.value) })}
                                    className={styles.input}
                                />
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>ביטול</Button>
                            <Button type="submit" variant="primary">שמור</Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
