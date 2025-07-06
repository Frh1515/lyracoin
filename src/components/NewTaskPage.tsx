@@ .. @@
 import { useNavigate } from 'react-router-dom';
 import { ArrowLeft, Plus, Wallet, Zap, Clock, TrendingUp, List, ArrowRightLeft } from 'lucide-react';
 import { useLanguage } from '../context/LanguageContext';
-import { getUserProfile, type UserProfile } from '../../lib/supabase/getUserProfile';
-import { convertMinutesToLyra } from '../../lib/supabase/exchangeSystem';
+import { getUserProfile } from '../../lib/supabase/getUserProfile';
 import ChargeBalanceModal from '../components/ChargeBalanceModal';
 import AddTaskInterface from '../components/AddTaskInterface';
 import MyTasksInterface from '../components/MyTasksInterface';
@@ .. @@
             </div>
           </div>
 
-          {/* Exchange Currency */}
-          <div 
-            onClick={() => navigate('/exchange')}
-            className="bg-black/40 backdrop-blur-sm border border-neonGreen/30 rounded-xl p-6 shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:scale-105 transition duration-300 cursor-pointer"
-          >
-            <div className="flex items-center gap-3 mb-4">
-              <div className="w-10 h-10 bg-neonGreen rounded-full flex items-center justify-center">
-                <ArrowRightLeft className="w-5 h-5 text-black" />
-              </div>
-              <h3 className="text-lg font-semibold text-white">
-                {language === 'ar' ? 'تحويل العملات' : 'Exchange Currency'}
-              </h3>
-            </div>
-            
-            <p className="text-white/70 text-sm mb-4">
-              {language === 'ar' 
-                ? 'شراء وبيع LYRA وتحويل الدقائق'
-                : 'Buy and sell LYRA and convert minutes'
-              }
-            </p>
-            
-            <div className="bg-neonGreen/10 border border-neonGreen/30 rounded-lg p-3">
-              <p className="text-neonGreen font-medium text-sm text-center">
-                {language === 'ar' ? 'متاح الآن' : 'Available Now'}
-              </p>
-            </div>
-          </div>
-
           {/* Create Paid Task */}
           <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 transition duration-300 cursor-pointer">
             <div className="flex items-center gap-3 mb-4">