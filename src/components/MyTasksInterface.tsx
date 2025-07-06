import React, { useState, useEffect } from 'react';
import { Play, Pause, Trash2, ExternalLink, Plus, Globe, TrendingUp, Clock, DollarSign, Users, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getUserPaidTasks } from '../../lib/supabase/paidTasksSystem';
import { pauseTask, deleteTask, testTaskLink } from '../../lib/supabase/managePaidTasks';
import { addTaskBalance, simulateTaskClicks } from '../../lib/supabase/taskConsumptionSystem';
import toast from 'react-hot-toast';
import TaskCompletionModal from './TaskCompletionModal';

interface MyTasksInterfaceProps {
  isVisible: boolean;
  userLyraBalance: number;
  onBalanceUpdate: () => void;
}

interface PaidTask {
  id: string;
  title: string;
  platform: string;
  link: string;
  totalClicks: number;
  completedClicks: number;
  community: string;
  status: 'active' | 'paused' | 'completed';
  balanceUsed: number;
  createdAt: string;
  icon: string;
}

const MyTasksInterface: React.FC<MyTasksInterfaceProps> = ({
  isVisible,
  userLyraBalance,
  onBalanceUpdate
}) => {
  const { language } = useLanguage();
  const [tasks, setTasks] = useState<PaidTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingBalance, setAddingBalance] = useState<string | null>(null);
  const [additionalBalance, setAdditionalBalance] = useState<{ [key: string]: number }>({});

  // Simulation states
  const [simulatingClicks, setSimulatingClicks] = useState<string | null>(null);
  const [simulationAmount, setSimulationAmount] = useState<{ [key: string]: number }>({});
  
  // Task completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedTask, setCompletedTask] = useState<{
    title: string;
    platform: string;
    totalClicks: number;
    lyraSpent: number;
  } | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchTasks();
    }
  }, [isVisible]);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // الحصول على المهام الحقيقية من قاعدة البيانات
      const { data, error } = await getUserPaidTasks();
      
      if (error) {
        throw error;
      }

      // تحويل البيانات إلى التنسيق المطلوب
      const formattedTasks: PaidTask[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        platform: task.platform,
        link: task.link,
        totalClicks: task.totalClicks,
        completedClicks: task.completedClicks,
        community: task.targetCommunity,
        status: mapTaskStatus(task.status),
        balanceUsed: task.pricePaid,
        createdAt: task.createdAt,
        icon: getPlatformIcon(task.platform)
      }));
      
      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في تحميل المهام'
          : 'Failed to load tasks'
      );
    } finally {
      setLoading(false);
    }
  };

  // تحويل حالة المهمة من قاعدة البيانات إلى التنسيق المطلوب
  const mapTaskStatus = (dbStatus: string): 'active' | 'paused' | 'completed' => {
    switch (dbStatus) {
      case 'payment_verified':
      case 'active':
        return 'active';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      default:
        return 'paused';
    }
  };

  // الحصول على أيقونة المنصة
  const getPlatformIcon = (platform: string): string => {
    const icons: { [key: string]: string } = {
      facebook: '📘',
      instagram: '📷',
      twitter: '🐦',
      tiktok: '🎵',
      youtube: '📺',
      telegram: '✈️',
      website: '🎯'
    };
    return icons[platform] || '🎯';
  };

  const getPlatformInfo = (platform: string, link: string) => {
    const domain = link.toLowerCase();
    
    if (domain.includes('facebook.com')) {
      return { title: 'Facebook', icon: '📘', color: 'border-blue-500 bg-blue-500/10' };
    } else if (domain.includes('instagram.com')) {
      return { title: 'Instagram', icon: '📷', color: 'border-pink-500 bg-pink-500/10' };
    } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      return { title: 'Twitter', icon: '🐦', color: 'border-sky-400 bg-sky-400/10' };
    } else if (domain.includes('tiktok.com')) {
      return { title: 'TikTok', icon: '🎵', color: 'border-pink-600 bg-pink-600/10' };
    } else if (domain.includes('youtube.com')) {
      return { title: 'YouTube', icon: '📺', color: 'border-red-500 bg-red-500/10' };
    } else if (domain.includes('telegram.org') || domain.includes('t.me')) {
      return { title: 'Telegram', icon: '✈️', color: 'border-cyan-400 bg-cyan-400/10' };
    } else {
      return { title: 'LYRA Task', icon: '🎯', color: 'border-neonGreen bg-neonGreen/10' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'paused': return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
      case 'completed': return 'text-blue-400 bg-blue-400/20 border-blue-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return language === 'ar' ? 'نشطة' : 'Active';
      case 'paused': return language === 'ar' ? 'موقوفة' : 'Paused';
      case 'completed': return language === 'ar' ? 'مكتملة' : 'Completed';
      default: return status;
    }
  };

  const getCommunityFlag = (community: string) => {
    const flags: { [key: string]: string } = {
      'AR': '🇸🇦',
      'EN': '🇺🇸',
      'RU': '🇷🇺',
      'FR': '🇫🇷',
      'FA': '🇮🇷',
      'ID': '🇮🇩',
      'ES': '🇪🇸',
      'UZ': '🇺🇿'
    };
    return flags[community] || '🌍';
  };

  const handleAddBalance = async (taskId: string) => {
    const amount = additionalBalance[taskId];
    
    if (!amount || amount <= 0) {
      toast.error(
        language === 'ar' 
          ? 'يرجى إدخال مبلغ صحيح'
          : 'Please enter a valid amount'
      );
      return;
    }

    if (amount > userLyraBalance) {
      toast.error(
        language === 'ar' 
          ? 'الرصيد غير كافٍ'
          : 'Insufficient balance'
      );
      return;
    }

    setAddingBalance(taskId);
    
    try {
      // Call the addTaskBalance function
      const result = await addTaskBalance(taskId, amount);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Update local state
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return { 
            ...task, 
            balanceUsed: task.balanceUsed + amount,
            totalClicks: result.newTotalClicks || task.totalClicks,
            status: result.newStatus as 'active' | 'paused' | 'completed' || task.status
          };
        }
        return task;
      }));
      
      // Clear input
      setAdditionalBalance(prev => ({ ...prev, [taskId]: 0 }));
      
      // Update parent balance
      onBalanceUpdate();
      
      toast.success(
        language === 'ar'
          ? `تم إضافة ${amount} LYRA للمهمة`
          : `Added ${amount} LYRA to task`,
        { 
          duration: 3000,
          style: {
            background: '#00FFAA',
            color: '#000',
            fontWeight: 'bold'
          }
        }
      );
    } catch (error) {
      console.error('Error adding balance:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في إضافة الرصيد'
          : 'Failed to add balance'
      );
    } finally {
      setAddingBalance(null);
    }
  };

  // Function to simulate clicks for testing
  const handleSimulateClicks = async (taskId: string) => {
    const clicksToSimulate = simulationAmount[taskId];
    
    if (!clicksToSimulate || clicksToSimulate <= 0) {
      toast.error(
        language === 'ar' 
          ? 'يرجى إدخال عدد صحيح من الكليكات'
          : 'Please enter a valid number of clicks'
      );
      return;
    }

    setSimulatingClicks(taskId);
    
    try {
      // Call the simulateTaskClicks function
      const result = await simulateTaskClicks(taskId, clicksToSimulate);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Update local state
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          const newCompletedClicks = result.completedClicks || task.completedClicks;
          const isCompleted = result.isCompleted || newCompletedClicks >= task.totalClicks;
          
          return { 
            ...task, 
            completedClicks: newCompletedClicks,
            status: isCompleted ? 'completed' as 'active' | 'paused' | 'completed' : task.status
          };
        }
        return task;
      }));
      
      // Show completion modal if task is completed
      if (result.isCompleted) {
        const completedTaskData = tasks.find(t => t.id === taskId);
        if (completedTaskData) {
          setCompletedTask({
            title: completedTaskData.title,
            platform: completedTaskData.platform,
            totalClicks: completedTaskData.totalClicks,
            lyraSpent: completedTaskData.balanceUsed
          });
          setShowCompletionModal(true);
        }
      }
      
      // Clear input
      setSimulationAmount(prev => ({ ...prev, [taskId]: 0 }));
      
      toast.success(
        language === 'ar'
          ? `تمت محاكاة ${clicksToSimulate} كليكة بنجاح`
          : `Successfully simulated ${clicksToSimulate} clicks`,
        { 
          duration: 3000,
          style: {
            background: '#00FFAA',
            color: '#000',
            fontWeight: 'bold'
          }
        }
      );
    } catch (error) {
      console.error('Error simulating clicks:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في محاكاة الكليكات'
          : 'Failed to simulate clicks'
      );
    } finally {
      setSimulatingClicks(null);
    }
  };

  const handleToggleStatus = async (taskId: string) => {
    try {
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: task.status === 'active' ? 'paused' : 'active' as 'active' | 'paused' | 'completed'
            }
          : task
      ));
      
      const task = tasks.find(t => t.id === taskId);
      const newStatus = task?.status === 'active' ? 'paused' : 'active';
      
      toast.success(
        language === 'ar'
          ? `تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} المهمة`
          : `Task ${newStatus === 'active' ? 'activated' : 'paused'}`,
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error toggling task status:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في تغيير حالة المهمة'
          : 'Failed to change task status'
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?')) {
      return;
    }

    try {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      toast.success(
        language === 'ar'
          ? 'تم حذف المهمة بنجاح'
          : 'Task deleted successfully',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في حذف المهمة'
          : 'Failed to delete task'
      );
    }
  };

  const handleTestLink = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
    toast.info(
      language === 'ar' 
        ? 'تم فتح الرابط في نافذة جديدة'
        : 'Link opened in new window',
      { duration: 2000 }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isVisible) return null;

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-8 mt-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neonGreen border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">
            {language === 'ar' ? 'جاري تحميل مهامك...' : 'Loading your tasks...'}
          </p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-8 mt-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-neonGreen/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-neonGreen" />
          </div>
          <h3 className="text-xl font-bold text-white mb-4">
            {language === 'ar' ? 'لا توجد مهام بعد' : 'No Tasks Yet'}
          </h3>
          <p className="text-white/70 mb-6">
            {language === 'ar' 
              ? 'لم تقم بإضافة أي مهام بعد، ابدأ الآن عبر ADD TASK'
              : 'You haven\'t added any tasks yet, start now via ADD TASK'
            }
          </p>
          <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-4">
            <p className="text-neonGreen font-medium text-sm">
              {language === 'ar' 
                ? '💡 نصيحة: استخدم زر ADD TASK لإنشاء مهامك المدفوعة الأولى'
                : '💡 Tip: Use the ADD TASK button to create your first paid tasks'
              }
            </p>
          </div>
        </div>
      </div>
      
      {/* Task Completion Modal */}
      {showCompletionModal && completedTask && (
        <TaskCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          taskTitle={completedTask.title}
          platform={completedTask.platform}
          totalClicks={completedTask.totalClicks}
          lyraSpent={completedTask.lyraSpent}
        />
      )}
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-neonGreen" />
        <h3 className="text-xl font-bold text-white">
          {language === 'ar' ? 'مهامي المدفوعة' : 'My Paid Tasks'}
        </h3>
        <span className="bg-neonGreen/20 text-neonGreen px-2 py-1 rounded-full text-xs font-medium">
          {tasks.length} {language === 'ar' ? 'مهمة' : 'tasks'}
        </span>
      </div>

      <div className="space-y-6">
        {tasks
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((task) => {
            const platformInfo = getPlatformInfo(task.platform, task.link);
            const progressPercentage = (task.completedClicks / task.totalClicks) * 100;
            
            return (
              <div
                key={task.id}
                className={`border rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${platformInfo.color} shadow-[0_0_15px_rgba(0,255,136,0.2)]`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center text-2xl">
                      {platformInfo.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{platformInfo.title}</h4>
                      <p className="text-white/60 text-sm">
                        {language === 'ar' ? 'تم الإنشاء:' : 'Created:'} {formatDate(task.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Community Badge */}
                    <div className="bg-black/30 px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="text-lg">{getCommunityFlag(task.community)}</span>
                      <span className="text-white font-medium text-sm">{task.community}</span>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm">
                      {language === 'ar' ? 'التقدم:' : 'Progress:'}
                    </span>
                    <span className="text-white font-bold">
                      {task.completedClicks.toLocaleString()} / {task.totalClicks.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-neonGreen transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-white/60 text-xs mt-1">
                    {progressPercentage.toFixed(1)}% {language === 'ar' ? 'مكتمل' : 'completed'}
                  </p>
                </div>

                {/* Balance Used */}
                <div className="mb-4 p-3 bg-black/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">
                      {language === 'ar' ? 'الرصيد المستهلك:' : 'Balance Used:'}
                    </span>
                    <span className="text-neonGreen font-bold">
                      {task.balanceUsed.toLocaleString()} LYRA COIN
                    </span>
                  </div>
                </div>

                {/* Add Balance Section */}
                <div className="mb-4 p-3 bg-neonGreen/10 border border-neonGreen/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="w-4 h-4 text-neonGreen" />
                    <span className="text-white font-medium text-sm">
                      {language === 'ar' ? 'إضافة رصيد للمهمة' : 'Add Balance to Task'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={additionalBalance[task.id] || ''}
                      onChange={(e) => setAdditionalBalance(prev => ({
                        ...prev,
                        [task.id]: Number(e.target.value)
                      }))}
                      placeholder="100"
                      min="1"
                      max={userLyraBalance}
                      className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-neonGreen focus:outline-none transition"
                    />
                    <button
                      onClick={() => handleAddBalance(task.id)}
                      disabled={addingBalance === task.id || !additionalBalance[task.id] || additionalBalance[task.id] > userLyraBalance}
                      className="bg-neonGreen text-black px-4 py-2 rounded-lg font-medium hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {addingBalance === task.id ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span className="text-sm">
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </span>
                    </button>
                  </div>
                  <p className="text-white/50 text-xs mt-1">
                    {language === 'ar' 
                      ? `رصيدك الحالي: ${userLyraBalance.toLocaleString()} LYRA`
                      : `Your balance: ${userLyraBalance.toLocaleString()} LYRA`
                    }
                  </p>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center gap-3">
                  {/* Play/Pause Button */}
                  <button
                    onClick={() => handleToggleStatus(task.id)}
                    disabled={task.status === 'completed'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      task.status === 'active'
                        ? 'bg-yellow-400 text-black hover:brightness-110'
                        : task.status === 'paused'
                        ? 'bg-green-500 text-white hover:brightness-110'
                        : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }`}
                    title={
                      task.status === 'active' 
                        ? (language === 'ar' ? 'إيقاف المهمة' : 'Pause Task')
                        : task.status === 'paused'
                        ? (language === 'ar' ? 'تفعيل المهمة' : 'Resume Task')
                        : (language === 'ar' ? 'مكتملة' : 'Completed')
                    }
                  >
                    {task.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : task.status === 'paused' ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {task.status === 'active' 
                        ? '⏸'
                        : task.status === 'paused'
                        ? '▶️'
                        : '✅'
                      }
                    </span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:brightness-110 transition"
                    title={language === 'ar' ? 'حذف المهمة' : 'Delete Task'}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">🗑</span>
                  </button>

                  {/* Test Link Button */}
                  <button
                    onClick={() => handleTestLink(task.link)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:brightness-110 transition"
                    title={language === 'ar' ? 'تجربة الرابط' : 'Test Link'}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">TEST</span>
                  </button>
                </div>
              </div>
            );
              {/* Simulate Clicks Section (for testing) */}
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  <span className="text-white font-medium text-sm">
                    {language === 'ar' ? 'محاكاة الكليكات (للاختبار)' : 'Simulate Clicks (Testing)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={simulationAmount[task.id] || ''}
                    onChange={(e) => setSimulationAmount(prev => ({
                      ...prev,
                      [task.id]: Number(e.target.value)
                    }))}
                    placeholder="10"
                    min="1"
                    max={task.totalClicks - task.completedClicks}
                    className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none transition"
                  />
                  <button
                    onClick={() => handleSimulateClicks(task.id)}
                    disabled={simulatingClicks === task.id || !simulationAmount[task.id] || task.status !== 'active'}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {simulatingClicks === task.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {language === 'ar' ? 'محاكاة' : 'Simulate'}
                    </span>
                  </button>
                </div>
                <p className="text-white/50 text-xs mt-1">
                  {language === 'ar' 
                    ? `الكليكات المتبقية: ${task.totalClicks - task.completedClicks}`
                    : `Remaining clicks: ${task.totalClicks - task.completedClicks}`
                  }
                </p>
              </div>

          })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/30 border border-neonGreen/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-neonGreen mb-1">
            {tasks.filter(t => t.status === 'active').length}
          </div>
          <p className="text-white/70 text-sm">
            {language === 'ar' ? 'مهام نشطة' : 'Active Tasks'}
          </p>
        </div>
        
        <div className="bg-black/30 border border-blue-400/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {tasks.reduce((sum, task) => sum + task.completedClicks, 0).toLocaleString()}
          </div>
          <p className="text-white/70 text-sm">
            {language === 'ar' ? 'إجمالي الكليكات' : 'Total Clicks'}
          </p>
        </div>
        
        <div className="bg-black/30 border border-yellow-400/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400 mb-1">
            {tasks.reduce((sum, task) => sum + task.balanceUsed, 0).toLocaleString()}
          </div>
          <p className="text-white/70 text-sm">
            {language === 'ar' ? 'LYRA مستهلك' : 'LYRA Spent'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyTasksInterface;