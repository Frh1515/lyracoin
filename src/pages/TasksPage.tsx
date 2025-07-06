Here's the fixed version with all missing closing brackets added:

```typescript
// ... [previous code remains the same until the Paid Tasks Section]

          {/* Paid Tasks Section - Integrated with Daily Tasks */}
          {paidTasksLoaded && paidTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-red-400" />
                <h4 className="text-lg font-semibold text-red-400">
                  {language === 'ar' ? '🔥 مهام مدفوعة' : '🔥 Paid Tasks'}
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {paidTasks
                  .map((task) => (
                    <PaidTaskCard
                      key={task.id}
                      task={task}
                      isCompleted={completedPaidTasks.has(task.id)}
                      onTaskClick={handlePaidTaskClick}
                    />
                  ))}
              </div>
              
              <div className="bg-black/30 border border-red-400/30 rounded-lg p-3 mb-4">
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyTasks.map((task) => {
              const platformConfig = getPlatformConfig(task.platform);
              const buttonConfig = getTaskButton(task.id, 'daily');
              const isCompleted = completedDailyTasks.has(task.id);
              const localizedContent = getLocalizedTaskContent(task);
              const isVideoTask = task.platform === 'youtube' || task.platform === 'tiktok';
              
              // Determine reward amount based on platform
              const pointsReward = isVideoTask ? 20 : task.points_reward;
              const minutesReward = isVideoTask ? 100 : 10;
              
              return (
                <div
                  key={task.id}
                  className={\`p-4 backdrop-blur-sm border rounded-xl text-white transition-all duration-300 ${
                    isCompleted
                      ? `bg-neonGreen/10 ${platformConfig.borderColor} opacity-50` 
                      : `bg-black/40 ${platformConfig.borderColor} ${platformConfig.glow} hover:scale-105 hover:brightness-110`
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <platformConfig.icon className={\`w-6 h-6 ${platformConfig.bgColor} rounded-lg p-1 text-white`} />
                    <h5 className="font-medium text-sm">{localizedContent.title}</h5>
                  </div>
                  
                  <p className="text-xs text-white/70 mb-3">
                    {localizedContent.description}
                    {isVideoTask && (
                      <span className="block mt-1 text-yellow-400">
                        {language === 'ar' 
                          ? '(كلمة المرور موجودة في الفيديو)'
                          : '(Password is in the video)'
                        }
                      </span>
                    )}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neonGreen">
                      +{pointsReward} {language === 'ar' ? 'نقطة' : 'points'} & +{minutesReward} {language === 'ar' ? 'دقيقة' : 'minutes'}
                    </span>
                    
                    <button
                      onClick={() => {
                        if (buttonConfig.text.includes('Start') || buttonConfig.text.includes('ابدأ')) {
                          handleStartTask(task.id, 'daily', platformConfig.link);
                        } else if (buttonConfig.text.includes('Password') || buttonConfig.text.includes('كلمة المرور')) {
                          // Show password modal
                          setPasswordModalTaskId(task.id);
                          setPasswordModalTaskTitle(localizedContent.title);
                          setPasswordModalTaskLink(platformConfig.link || '');
                          setPasswordModalTaskPlatform(task.platform);
                          setShowPasswordModal(true);
                        } else if (buttonConfig.text.includes('Claim') || buttonConfig.text.includes('مطالبة')) {
                          handleClaimTask(task.id, 'daily');
                        }
                      }}
                      disabled={buttonConfig.disabled}
                      className={\`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${buttonConfig.className}`}
                    >
                      {buttonConfig.text}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 px-6">
        <div className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">
            {language === 'ar' ? 'ℹ️ كيفية إكمال المهام' : 'ℹ️ How to Complete Tasks'}
          </h4>
          <ul className="text-sm text-white/70 space-y-1">
            <li>
              {language === 'ar' 
                ? '1. اضغط على "ابدأ المهمة" لفتح الرابط وبدء العد التنازلي'
                : '1. Click "Start Task" to open the link and start the countdown'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '2. لمهام اليوتيوب وتيك توك، ستحتاج إلى إدخال كلمة المرور من الفيديو'
                : '2. For YouTube and TikTok tasks, you\'ll need to enter the password from the video'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '3. اضغط على "مطالبة" لاستلام النقاط والدقائق'
                : '3. Click "Claim" to receive points and minutes'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '4. المهام الثابتة تعطي 20 نقطة + 20 دقيقة، المهام اليومية تعطي 10 نقاط + 10 دقائق'
                : '4. Fixed tasks give 20 points + 20 minutes, daily tasks give 10 points + 10 minutes'
              }
            </li>
            <li>
              {language === 'ar' 
                ? '5. التعدين: اضغط "تعدين" لبدء جلسة 6 ساعات، استلم المكافآت كل 24 ساعة'
                : '5. Mining: Click "Mine" to start 6-hour session, claim rewards every 24 hours'
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
```