import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAssets, useAddAsset, useDeleteAsset } from '../hooks/useAssets';
import BottomNav from '../components/BottomNav';

const AssetsPage: React.FC = () => {
    const { locale } = useLanguage();
    const navigate = useNavigate();
    const isZh = locale === 'zh';

    const { data, isLoading } = useAssets();
    const addAssetMutation = useAddAsset();
    const deleteAssetMutation = useDeleteAsset();

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBrand, setNewBrand] = useState('');
    const [newType, setNewType] = useState('appliance');

    const assets = data?.assets || [];

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        
        try {
            await addAssetMutation.mutateAsync({
                name: newName,
                brand: newBrand,
                type: newType,
            });
            setNewName('');
            setNewBrand('');
            setNewType('appliance');
            setIsAdding(false);
        } catch (err) {
            console.error('Failed to add asset:', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(isZh ? '确定要删除这个设备吗？' : 'Are you sure you want to delete this asset?')) return;
        try {
            await deleteAssetMutation.mutateAsync(id);
        } catch (err) {
            console.error('Failed to delete asset:', err);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark pb-[90px] overflow-x-hidden shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 pt-6 pb-4 border-b border-black/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="text-text-main-light dark:text-text-main-dark">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold text-text-main-light dark:text-text-main-dark">
                            {isZh ? '我的设备' : 'My Assets'}
                        </h1>
                    </div>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 px-6 pt-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : assets.length === 0 && !isAdding ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-surface-dark rounded-3xl flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-4xl text-gray-400">inventory_2</span>
                        </div>
                        <h2 className="text-lg font-bold mb-2">{isZh ? '暂无设备' : 'No Assets Yet'}</h2>
                        <p className="text-sm text-gray-500 mb-8 max-w-[240px]">
                            {isZh ? '添加您的家电设备，以便 AI 提供更精准的维修建议' : 'Add your home appliances for more accurate AI maintenance advice.'}
                        </p>
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                        >
                            {isZh ? '添加第一个设备' : 'Add First Asset'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {isAdding && (
                            <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 shadow-xl ring-1 ring-black/5 page-enter">
                                <h3 className="font-bold mb-4">{isZh ? '新增设备' : 'New Asset'}</h3>
                                <form onSubmit={handleAdd} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                                            {isZh ? '种类' : 'Type'}
                                        </label>
                                        <div className="flex gap-2">
                                            {['appliance', 'system', 'structure', 'other'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setNewType(t)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${newType === t ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-black/20 text-gray-500'}`}
                                                >
                                                    {t === 'appliance' ? (isZh ? '家电' : 'Appliance') : 
                                                     t === 'system' ? (isZh ? '综合系统' : 'System') : 
                                                     t === 'structure' ? (isZh ? '结构部件' : 'Structure') : (isZh ? '其他' : 'Other')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                                            {isZh ? '设备名称' : 'Asset Name'}
                                        </label>
                                        <input 
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            placeholder={isZh ? '例如：客厅空调' : 'e.g. Living Room AC'}
                                            className="w-full h-12 px-4 bg-gray-50 dark:bg-black/20 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">
                                            {isZh ? '品牌 (可选)' : 'Brand (Optional)'}
                                        </label>
                                        <input 
                                            value={newBrand}
                                            onChange={e => setNewBrand(e.target.value)}
                                            placeholder={isZh ? '例如：格力' : 'e.g. Gree'}
                                            className="w-full h-12 px-4 bg-gray-50 dark:bg-black/20 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            type="button"
                                            onClick={() => setIsAdding(false)}
                                            className="flex-1 h-12 bg-gray-100 dark:bg-surface-dark rounded-xl text-sm font-bold"
                                        >
                                            {isZh ? '取消' : 'Cancel'}
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 h-12 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20"
                                        >
                                            {isZh ? '保存' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            {assets.map(asset => (
                                <div key={asset.id} className="bg-white dark:bg-surface-dark rounded-[24px] p-5 shadow-sm ring-1 ring-black/5 flex items-center justify-between group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-black/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-2xl text-primary">
                                                {asset.type === 'plumbing' ? 'plumbing' : asset.type === 'electrical' ? 'bolt' : 'kitchen'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[15px]">{asset.name}</h4>
                                            <p className="text-xs text-gray-400 font-medium">{asset.brand || (isZh ? '通用品牌' : 'Generic Brand')}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(asset.id)}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-racing-red hover:bg-racing-red/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default AssetsPage;
