
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { UserAsset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

const UserAssetsCard = () => {
    const { t } = useLanguage();
    const [assets, setAssets] = useState<UserAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAsset, setNewAsset] = useState({
        name: '',
        type: 'appliance',
        brand: '',
        model: ''
    });

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        try {
            const data = await api.getAssets();
            setAssets(data.assets || []);
        } catch (err) {
            console.error('Failed to load assets', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.addAsset(newAsset);
            setShowAddForm(false);
            setNewAsset({ name: '', type: 'appliance', brand: '', model: '' });
            loadAssets();
        } catch (err) {
            alert('Failed to add asset');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.deleteAsset(id);
            loadAssets();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-text-main-light dark:text-text-main-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">kitchen</span>
                    My Home Assets
                </h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="text-primary text-sm font-bold"
                >
                    {showAddForm ? 'Cancel' : '+ Add'}
                </button>
            </div>

            {showAddForm && (
                <form onSubmit={handleAddAsset} className="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="grid gap-3">
                        <select
                            value={newAsset.type}
                            onChange={e => setNewAsset({ ...newAsset, type: e.target.value })}
                            className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="appliance">Appliance</option>
                            <option value="system">System (HVAC, etc)</option>
                            <option value="structure">Structure</option>
                        </select>
                        <input
                            placeholder="Name (e.g. Fridge)"
                            value={newAsset.name}
                            onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                            className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                placeholder="Brand"
                                value={newAsset.brand}
                                onChange={e => setNewAsset({ ...newAsset, brand: e.target.value })}
                                className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <input
                                placeholder="Model"
                                value={newAsset.model}
                                onChange={e => setNewAsset({ ...newAsset, model: e.target.value })}
                                className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <button type="submit" className="bg-primary text-white py-2 rounded font-bold">
                            Save Asset
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center py-4">Loading...</div>
            ) : assets.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-2">No assets added yet.</p>
            ) : (
                <div className="space-y-3">
                    {assets.map(asset => (
                        <div key={asset.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-gray-400">
                                    {asset.type === 'appliance' ? 'kitchen' : asset.type === 'system' ? 'hvac' : 'home'}
                                </span>
                                <div>
                                    <p className="font-bold text-sm text-text-main-light dark:text-text-main-dark">{asset.name}</p>
                                    <p className="text-xs text-gray-500">{asset.brand} {asset.model}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(asset.id)} className="text-gray-400 hover:text-red-500">
                                <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserAssetsCard;
