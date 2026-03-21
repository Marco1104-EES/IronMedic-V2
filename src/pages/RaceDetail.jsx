import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Crown, Sprout, Timer, AlertTriangle, Activity, Users, ChevronLeft, Flag, Edit3, Zap, UserCheck, Loader2, ChevronRight, X, ShieldAlert, Trash2, Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function RaceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [activeRace, setActiveRace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [previewSlot, setPreviewSlot] = useState(null) 
  const [waitlist, setWaitlist] = useState([]) 
  const [currentUser, setCurrentUser] = useState(null) 

  const [isGodMode, setIsGodMode] = useState(false)
  const [insertModalOpen, setInsertModalOpen] = useState(false)
  const [insertData, setInsertData] = useState({ slotId: null, name: '', roleTag: '' })

  useEffect(() => { 
      fetchCurrentUserAndRace() 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchCurrentUserAndRace = async () => {
      setLoading(true)
      try {
          const { data: { user } } = await supabase.auth.getUser()
          let fetchedUser = null;
          let godModeCheck = false;

          if (user && user.email) {
              const { data: profile } = await supabase.from('profiles').select('*').eq('email', user.email).maybeSingle()
              if (profile) {
                  fetchedUser = { ...profile, auth_user_id: user.id };
                  const role = profile.role?.toUpperCase() || 'USER';
                  if (role === 'SUPER_ADMIN' || role === 'TOURNAMENT_DIRECTOR') {
                      godModeCheck = true;
                  }
              }
          }
          setCurrentUser(fetchedUser);
          setIsGodMode(godModeCheck);

          const { data, error } = await supabase.from('races').select('*').eq('id', id).single()
          if (error) throw error
          if (data) {
              setActiveRace({
                  id: data.id, title: data.name, date: data.date, gatherTime: data.gather_time,
                  location: data.location, type: data.type, status: data.status,
                  imageUrl: data.image_url, slots: data.slots_data || [],
                  waitlist_data: data.waitlist_data || [],
                  openTime: data.open_time
              })
              setWaitlist(data.waitlist_data || [])
          } else { navigate('/races') }

      } catch (error) {
          alert("載入資料失敗。")
      } finally { setLoading(false) }
  }

  const getUserTier = (user) => {
      if (!user) return 6;
      if (user.is_vip === 'Y') return 1;
      if (user.is_team_leader === 'Y') return 2;
      if (user.is_new_member === 'Y' || user.total_races < 2) return 3;
      if (user.training_status === 'Y' || user.training_status === true || user.training_status === 'true' || user.training_status === 1) return 4;
      if (user.is_current_member === 'Y') return 5;
      return 6;
  }

  const getRegistrationPhase = (openTimeStr) => {
      if (!openTimeStr) return 2; 
      const now = new Date();
      const openTime = new Date(openTimeStr);
      if (now < openTime) return -1; 

      const midnight1 = new Date(openTime);
      midnight1.setHours(24, 0, 0, 0); 

      const midnight2 = new Date(midnight1);
      midnight2.setDate(midnight2.getDate() + 1); 

      if (now < midnight1) return 0; 
      if (now < midnight2) return 1; 
      return 2; 
  }

  // 🌟 時序封印機制核心
  const today = new Date();
  today.setHours(0,0,0,0);
  const isPastRace = activeRace ? new Date(activeRace.date) < today : false;

  const checkEligibility = () => {
      if (!activeRace || !currentUser) return { allPassed: false, checks: {}, openMessage: '' }
      
      const checks = { 
          isCurrentMember: currentUser.is_current_member === 'Y', 
          isLicenseValid: currentUser.license_expiry && new Date(currentUser.license_expiry) >= new Date(activeRace.date), 
          isTriShirtValid: true, 
          genderMatch: true,
          isTimeOpenForMe: true 
      }
      
      if (['鐵人三項', '二鐵', '路跑接力', '游泳'].includes(activeRace.type)) checks.isTriShirtValid = !!currentUser.shirt_expiry_25;
      
      if (selectedSlot) {
          const slotInfo = activeRace.slots.find(s => s.id === selectedSlot)
          let uGender = 'M';
          if(currentUser.national_id && currentUser.national_id.charAt(1) === '2') uGender = 'F';
          if (slotInfo?.genderLimit === 'F' && uGender === 'M') checks.genderMatch = false;
      }

      let openMessage = "";
      const phase = getRegistrationPhase(activeRace.openTime);
      const userTier = getUserTier(currentUser);
      
      // 🌟 修復點：嚴謹的空值防呆 (??) 取代原本的 (!== undefined)
      const newbiePasses = currentUser.newbie_passes ?? 3;

      if (isPastRace) {
          checks.isTimeOpenForMe = false;
          openMessage = "本賽事已經結束，報名已截止。";
      } else if (userTier === 6) {
          checks.isTimeOpenForMe = false;
          openMessage = "非當屆會員，無法報名賽事";
      } else if (phase === -1) {
          checks.isTimeOpenForMe = false;
          openMessage = `本賽事將於 ${new Date(activeRace.openTime).toLocaleString('zh-TW', {hour12: false})} 開放報名`;
      } else if (userTier === 1) { 
          checks.isTimeOpenForMe = true;
      } else if (phase === 0) {
          if (userTier === 2) checks.isTimeOpenForMe = true; 
          else {
              checks.isTimeOpenForMe = false;
              openMessage = "今日僅開放「帶隊教官」報名，您的身分將於明日 00:00 解鎖";
          }
      } else if (phase === 1) {
          if (userTier <= 4) {
              if (userTier === 3 && newbiePasses <= 0) {
                  checks.isTimeOpenForMe = false;
                  openMessage = "您的「3 次新人優先報名權利」已用罄，請等候明日全面開放階段報名。";
              } else {
                  checks.isTimeOpenForMe = true; 
              }
          }
          else {
              checks.isTimeOpenForMe = false;
              openMessage = "今日僅開放「帶隊官/新人/當屆訓練」，您的身分將於明日 00:00 解鎖";
          }
      } else {
          checks.isTimeOpenForMe = true; 
      }
      
      if (isGodMode) return { checks: { ...checks, isTimeOpenForMe: true }, allPassed: true, openMessage: '' };
      
      return { checks, allPassed: Object.values(checks).every(v => v === true), openMessage };
  }

  const eligibility = checkEligibility();
  const allPassed = eligibility.allPassed;
  const checks = eligibility.checks;
  const openMessage = eligibility.openMessage;

  const getInitial = (name) => name ? name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').charAt(0) || '?' : '?'

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
  if (!activeRace) return null

  const targetSlotData = activeRace.slots.find(s => s.id === selectedSlot);
  const isSelectedSlotFull = targetSlotData ? (targetSlotData.filled || 0) >= (targetSlotData.capacity || 1) : false;

  const handleRegister = async () => {
      if (!currentUser) return alert("請先登入！");
      if (!selectedSlot) return alert("請先選擇您要報名的賽段！")
      if (isPastRace) return alert("本賽事已經結束，無法報名！");
      if (!allPassed && !isGodMode) return alert("報名資格審查未通過，無法報名！")

      const phase = getRegistrationPhase(activeRace.openTime);
      const userTier = getUserTier(currentUser);

      let isAlreadyInRace = false;
      let existingSlotName = "";
      let hasTeamLeaderAlready = false;

      if (!isGodMode) { 
          for (const slot of activeRace.slots) {
              if (slot.assignee) {
                  const assignees = slot.assignee.split('|');
                  for (const item of assignees) {
                      if (!item) continue;
                      try {
                          const p = JSON.parse(item);
                          if (p.id === currentUser.id || p.name === currentUser.full_name) {
                              isAlreadyInRace = true;
                              existingSlotName = slot.name;
                          }
                          if (p.roleTag === '帶隊教官') {
                              hasTeamLeaderAlready = true;
                          }
                      } catch (e) {
                          const legacyName = item.split('#')[0].trim();
                          if (legacyName === currentUser.full_name) {
                              isAlreadyInRace = true;
                              existingSlotName = slot.name;
                          }
                      }
                  }
              }
          }
          if (waitlist.some(w => w.id === currentUser.id || w.name === currentUser.full_name)) {
              isAlreadyInRace = true;
              existingSlotName = "候補區";
          }
      }

      if (isAlreadyInRace) {
          return alert(`❌ 系統攔截：您已經報名【${existingSlotName}】！\n一個人無法同時報名多個組別 (禁止分身)。若要更改組別，請先至數位 ID 卡「取消報名」後再重新操作。`);
      }

      let assignedRoleTag = null;
      if (phase === 0 && userTier === 2 && !isGodMode) {
          if (hasTeamLeaderAlready) {
              return alert(`⚠️ 報名失敗：本場賽事之【帶隊教官】名額已被登記！\n請於下一階段以一般身分報名，或聯繫賽事總監。`);
          } else {
              assignedRoleTag = '帶隊教官';
          }
      }

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      
      const participantInfo = {
          id: currentUser.id,
          name: currentUser.full_name || currentUser.email.split('@')[0],
          email: currentUser.email,
          tier: userTier,
          isVip: currentUser.is_vip === 'Y',
          isNew: currentUser.is_new_member === 'Y' || currentUser.total_races < 2,
          timestamp: timestamp,
          slot: selectedSlot,
          roleTag: assignedRoleTag,
          isMe: true 
      };

      let willBurnNewbiePass = false;
      // 🌟 修復點：嚴謹的空值防呆 (??) 取代原本的 (!== undefined)
      let newbiePassesLeft = currentUser.newbie_passes ?? 3;
      
      if (phase === 1 && userTier === 3 && !isGodMode) {
          willBurnNewbiePass = true;
      }

      if (!isSelectedSlotFull) {
          const updatedSlots = activeRace.slots.map(s => {
              if (s.id === selectedSlot) {
                  const currentFilled = s.filled || 0;
                  const newAssignee = s.assignee ? `${s.assignee}|${JSON.stringify(participantInfo)}` : JSON.stringify(participantInfo);
                  return { ...s, filled: currentFilled + 1, assignee: newAssignee };
              }
              return s;
          });

          setActiveRace({ ...activeRace, slots: updatedSlots });
          alert(`✅ 報名成功！您已正式加入【${targetSlotData.name}】${assignedRoleTag ? ` (並鎖定${assignedRoleTag}資格)` : ''}`);

          try {
              const { error } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', activeRace.id);
              if (error) throw error;
              
              if (willBurnNewbiePass) {
                  const newPasses = Math.max(0, newbiePassesLeft - 1);
                  await supabase.from('profiles').update({ newbie_passes: newPasses }).eq('id', currentUser.id);
                  setCurrentUser(prev => ({ ...prev, newbie_passes: newPasses }));
              }

              try {
                  if (currentUser.auth_user_id) {
                      let successMsg = `您已成功報名【${activeRace.title}】的「${targetSlotData.name}」賽段。`;
                      if (assignedRoleTag) successMsg += ` 您已自動登記為本場賽事之【${assignedRoleTag}】。`;
                      if (willBurnNewbiePass) successMsg += ` (已使用 1 次新人優先報名權利，剩餘 ${Math.max(0, newbiePassesLeft - 1)} 次)`;

                      const { error: notifError } = await supabase.from('user_notifications').insert([{
                          user_id: currentUser.auth_user_id,
                          tab: 'personal', 
                          category: 'race',
                          message: successMsg,
                          is_read: false
                      }]);
                      if (notifError) {
                          console.error("發送報名通知失敗", notifError);
                      }
                  }
              } catch(e) { console.error("發送報名通知異常", e) }

          } catch(e) { alert("報名寫入資料庫異常：" + e.message) }

      } else {
          const newWaitlist = [...waitlist, participantInfo].sort((a, b) => a.tier !== b.tier ? a.tier - b.tier : a.timestamp.localeCompare(b.timestamp));
          
          setActiveRace({ ...activeRace, waitlist_data: newWaitlist });
          setWaitlist(newWaitlist);
          alert(`⚠️ 該名額已滿，您已自動進入「候補池」。`);

          try {
              const { error } = await supabase.from('races').update({ waitlist_data: newWaitlist }).eq('id', activeRace.id);
              if (error) throw error;
              
              if (willBurnNewbiePass) {
                  const newPasses = Math.max(0, newbiePassesLeft - 1);
                  await supabase.from('profiles').update({ newbie_passes: newPasses }).eq('id', currentUser.id);
                  setCurrentUser(prev => ({ ...prev, newbie_passes: newPasses }));
              }

              try {
                  if (currentUser.auth_user_id) {
                      let waitMsg = `您已進入【${activeRace.title}】的候補名單，請靜候系統通知。`;
                      if (willBurnNewbiePass) waitMsg += ` (已扣除 1 次新人優先報名權利)`;

                      const { error: notifError } = await supabase.from('user_notifications').insert([{
                          user_id: currentUser.auth_user_id,
                          tab: 'personal',
                          category: 'race',
                          message: waitMsg,
                          is_read: false
                      }]);
                      if (notifError) {
                          console.error("發送候補通知失敗", notifError);
                      }
                  }
              } catch(e) { console.error("發送候補通知異常", e) }

          } catch(e) { alert("候補寫入資料庫異常：" + e.message) }
      }
  }

  const handleKickUser = async (slotId, userIdToKick, userName) => {
      if(!isGodMode) return;
      if(!window.confirm(`⚠️ 賽事總監警告 ⚠️\n確定要強制將【${userName}】從此賽段踢除嗎？`)) return;

      const updatedSlots = activeRace.slots.map(s => {
          if (s.id === slotId && s.assignee) {
              const assigneesArray = s.assignee.split('|').map(str => {
                  try { return JSON.parse(str); } catch(e) { return { id: str, name: str, isLegacy: true }; }
              });
              
              const newAssigneesArray = assigneesArray.filter(p => p.id !== userIdToKick && p.name !== userIdToKick);
              
              const newAssigneeString = newAssigneesArray.map(p => p.isLegacy ? p.name : JSON.stringify(p)).join('|');
              
              return { ...s, filled: Math.max(0, s.filled - 1), assignee: newAssigneeString };
          }
          return s;
      });

      setActiveRace({ ...activeRace, slots: updatedSlots });
      const updatedPreviewSlot = updatedSlots.find(s => s.id === slotId);
      if(updatedPreviewSlot) {
          setPreviewSlot({...updatedPreviewSlot, assignees: parseAssignees(updatedPreviewSlot.assignee)});
      }

      try {
          const { error } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', activeRace.id);
          if (error) throw error;
          
          if (userIdToKick && !String(userIdToKick).startsWith('force_')) {
              try {
                  await supabase.from('user_notifications').insert([{
                      user_id: userIdToKick,
                      tab: 'personal',
                      category: 'alert',
                      message: `您在【${activeRace.title}】的名額已被賽事總監異動，如有疑問請聯繫賽事總監。`,
                      is_read: false
                  }]);
              } catch(e) { console.error("發送踢除通知失敗", e) }
          }
      } catch(e) { alert("踢除寫入失敗：" + e.message) }
  }

  const openInsertModal = (e, slotId) => {
      e.stopPropagation(); 
      setInsertData({ slotId, name: '', roleTag: '' });
      setInsertModalOpen(true);
  }

  const handleForceInsert = async () => {
      if(!insertData.name.trim()) return alert("請輸入要安插的人員姓名！");
      
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      
      const newParticipant = {
          id: `force_${Date.now()}`,
          name: insertData.name,
          timestamp: timestamp,
          roleTag: insertData.roleTag || null,
          isVip: false,
          isNew: false
      };

      const updatedSlots = activeRace.slots.map(s => {
          if (s.id === insertData.slotId) {
              const newAssignee = s.assignee ? `${s.assignee}|${JSON.stringify(newParticipant)}` : JSON.stringify(newParticipant);
              return { ...s, filled: (s.filled || 0) + 1, assignee: newAssignee };
          }
          return s;
      });

      setActiveRace({ ...activeRace, slots: updatedSlots });
      setInsertModalOpen(false);

      try {
          const { error } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', activeRace.id);
          if (error) throw error;
          alert(`✅ 已強制將【${insertData.name}】安插至名單內。`);
      } catch(e) { alert("安插寫入失敗：" + e.message) }
  }

  const handleApproveFromWaitlist = async (user) => {
      if (!isGodMode) return;
      const updatedSlots = activeRace.slots.map(s => {
          if (s.id === user.slot) {
              const currentFilled = s.filled || 0;
              const newAssignee = s.assignee ? `${s.assignee}|${JSON.stringify(user)}` : JSON.stringify(user);
              return { ...s, filled: currentFilled + 1, assignee: newAssignee } 
          }
          return s;
      })
      
      const newWaitlist = waitlist.filter(q => q.id !== user.id);

      setActiveRace({ ...activeRace, slots: updatedSlots, waitlist_data: newWaitlist });
      setWaitlist(newWaitlist);
      alert(`✅ 已將 ${user.name} 遞補報名成功！`);

      try {
          const { error } = await supabase.from('races').update({ slots_data: updatedSlots, waitlist_data: newWaitlist }).eq('id', activeRace.id);
          if (error) throw error;
          
          try {
              await supabase.from('user_notifications').insert([{
                  user_id: user.id,
                  tab: 'personal',
                  category: 'race',
                  message: `🎉 恭喜！您在【${activeRace.title}】的候補名額已成功轉為正取！`,
                  is_read: false
              }]);
          } catch(e) { console.error("發送遞補通知失敗", e) }
      } catch(e) { alert("核准寫入失敗：" + e.message) }
  }

  const groupedSlots = activeRace.slots.reduce((acc, slot) => {
      const groupName = slot.group || '一般組別';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(slot);
      return acc;
  }, {});

  const parseAssignees = (assigneeString) => {
      if (!assigneeString) return [];
      const rawAssignees = assigneeString.split('|');
      return rawAssignees.map(item => {
          try {
              return JSON.parse(item); 
          } catch (e) {
              return { id: item.trim(), name: item.trim(), timestamp: '舊資料匯入', isLegacy: true };
          }
      });
  }

  const renderRoleBadge = (roleTag) => {
      if (!roleTag) return null;
      if (roleTag === '帶隊教官') return <span className="flex items-center text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-300 px-1.5 py-0.5 rounded font-black"><ShieldAlert size={10} className="mr-1"/> 帶隊官</span>;
      if (roleTag === '賽道教官') return <span className="flex items-center text-[10px] bg-orange-100 text-orange-700 border border-orange-300 px-1.5 py-0.5 rounded font-black"><Flag size={10} className="mr-1"/> 賽道官</span>;
      if (roleTag === '醫護教官') return <span className="flex items-center text-[10px] bg-rose-100 text-rose-700 border border-rose-300 px-1.5 py-0.5 rounded font-black"><Activity size={10} className="mr-1"/> 醫護官</span>;
      if (roleTag === '官方代表') return <span className="flex items-center text-[10px] bg-slate-800 text-amber-400 border border-slate-600 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> 代表</span>;
      return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans animate-fade-in flex flex-col">
      
      <div className="relative w-full bg-slate-900 pt-8 pb-48 lg:pb-56">
          <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${activeRace.imageUrl || '/default-race.jpg'})` }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
          
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center mb-10 lg:mb-16">
              <button onClick={() => navigate('/races')} className="text-white flex items-center gap-2 hover:text-blue-400 transition-colors bg-white/10 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/20 font-bold text-sm">
                  <ChevronLeft size={18}/> 返回任務大廳
              </button>
              {isGodMode && (
                  <button onClick={() => navigate(`/admin/race-builder?id=${activeRace.id}`)} className="text-amber-400 flex items-center gap-2 hover:bg-amber-400/20 transition-colors bg-slate-900/80 px-5 py-2.5 rounded-full backdrop-blur-md border border-amber-500/50 font-bold text-sm shadow-lg shadow-amber-900/50">
                      <Edit3 size={16}/> 編輯賽事
                  </button>
              )}
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <span className="bg-blue-600/90 backdrop-blur text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg mb-4 inline-block tracking-widest border border-blue-400/50">
                  {activeRace.type}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-2xl leading-tight max-w-5xl">
                  {activeRace.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-medium shadow-lg">
                      <Calendar size={16} className="text-blue-400"/> {activeRace.date}
                  </span>
                  <span className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-medium shadow-lg">
                      <Clock size={16} className="text-amber-400"/> {activeRace.gatherTime} 鳴槍
                  </span>
                  <span className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-medium shadow-lg">
                      <MapPin size={16} className="text-red-400"/> {activeRace.location}
                  </span>
              </div>
          </div>
      </div>

      <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-32 lg:-mt-40 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                  
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
                      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                          <Flag className="text-blue-600"/> 任務名額配置 (Slot Allocation)
                      </h2>
                      
                      <div className="space-y-8">
                          {Object.entries(groupedSlots).map(([groupName, slotsInGroup]) => (
                              <div key={groupName} className="space-y-4">
                                  <div className="flex items-center gap-4 mb-2">
                                      <h3 className="font-black text-slate-600 bg-slate-50 px-4 py-2 rounded-xl text-sm border border-slate-200 shadow-sm">{groupName}</h3>
                                      <div className="h-px bg-slate-200 flex-1"></div>
                                  </div>
                                  
                                  {slotsInGroup.map(slot => {
                                      const filledCount = slot.filled || 0;
                                      const slotCapacity = slot.capacity || 1; 
                                      const isFull = filledCount >= slotCapacity && slotCapacity > 0;
                                      const isSelected = selectedSlot === slot.id;
                                      
                                      const assignees = parseAssignees(slot.assignee);
                                      const displayAssignees = assignees.slice(0, 5);
                                      const extraCount = assignees.length - 5;

                                      return (
                                          <div key={slot.id} onClick={() => !isPastRace && setSelectedSlot(slot.id)}
                                              className={`relative p-5 md:p-6 rounded-2xl border-2 transition-all flex flex-col xl:flex-row xl:items-start justify-between gap-5
                                                  ${isPastRace ? 'bg-slate-50 opacity-80 border-slate-200 cursor-not-allowed'
                                                  : isSelected ? 'bg-blue-50/50 border-blue-500 shadow-lg ring-4 ring-blue-500/10 cursor-pointer' 
                                                  : isFull ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300 cursor-pointer' 
                                                  : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer'}`}>
                                              
                                              {isGodMode && !isPastRace && (
                                                  <div className="absolute top-4 right-4 xl:static xl:ml-auto z-10">
                                                      <button 
                                                          onClick={(e) => openInsertModal(e, slot.id)}
                                                          className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-1.5 rounded-lg border border-amber-300 shadow-sm transition-colors flex items-center gap-1 text-xs font-bold"
                                                          title="賽事總監：強制安插人員"
                                                      >
                                                          <Plus size={14}/> 安插
                                                      </button>
                                                  </div>
                                              )}

                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-3 flex-wrap mb-1 pr-16 xl:pr-0">
                                                      <h3 className={`font-black text-lg ${isPastRace || (isFull && !isSelected) ? 'text-slate-500' : 'text-slate-800'}`}>
                                                          {slot.name}
                                                      </h3>
                                                      {slot.genderLimit === 'F' && <span className="bg-pink-50 text-pink-600 text-[10px] px-2.5 py-1 rounded-full border border-pink-200 font-black tracking-widest">限定女性</span>}
                                                  </div>
                                                  
                                                  {assignees.length > 0 && (
                                                      <div className="mt-4">
                                                          <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                                              <CheckCircle size={14} className="text-green-500"/> 已報名名單:
                                                          </div>
                                                          <div 
                                                              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity w-fit group/list"
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setPreviewSlot({ ...slot, assignees }); 
                                                              }}
                                                          >
                                                              <div className="flex items-center -space-x-2.5">
                                                                  {displayAssignees.map((participant, idx) => {
                                                                      const hue = (idx * 60 + 200) % 360;
                                                                      const cleanName = participant.name.split('#')[0].trim();
                                                                      return (
                                                                          <div key={idx} 
                                                                              className="w-9 h-9 rounded-full border-[3px] border-white flex items-center justify-center text-sm font-black text-white shadow-sm ring-1 ring-slate-100"
                                                                              style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
                                                                          >
                                                                              {getInitial(cleanName)}
                                                                          </div>
                                                                      )
                                                                  })}
                                                                  {extraCount > 0 && (
                                                                      <div className="w-9 h-9 rounded-full border-[3px] border-white flex items-center justify-center text-xs font-black bg-slate-100 text-slate-600 shadow-sm ring-1 ring-slate-100">
                                                                          +{extraCount}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              <span className="text-xs font-bold ml-3 text-blue-600 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg group-hover/list:bg-blue-100 transition-colors">
                                                                  查看完整名單 <ChevronRight size={14}/>
                                                              </span>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                              
                                              <div className="flex items-center gap-4 shrink-0 xl:pt-1 mt-4 xl:mt-0">
                                                  <div className={`text-sm font-black px-4 py-2.5 rounded-xl border flex flex-col items-center justify-center min-w-[5.5rem]
                                                      ${isFull ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200 shadow-inner'}`}>
                                                      <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5 font-bold">名額</span>
                                                      <span>{filledCount} <span className="text-slate-400 mx-0.5">/</span> {slotCapacity}</span>
                                                  </div>
                                                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors 
                                                      ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-md' : isPastRace ? 'border-slate-200 bg-slate-100' : 'border-slate-300 bg-white'}`}>
                                                      {isSelected && <CheckCircle size={16}/>}
                                                  </div>
                                              </div>
                                          </div>
                                      )
                                  })}
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Users className="text-amber-500"/> 報名候補區 (Waitlist)</h2>
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1 border border-slate-200 shadow-inner"><Timer size={12}/> 依階級與時間排序</span>
                      </div>
                      
                      <div className="space-y-4">
                          {waitlist.length === 0 ? (
                              <div className="text-center py-12 text-slate-400 font-medium bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                  目前尚無人員候補
                              </div>
                          ) : (
                              waitlist.map((user, idx) => {
                                  const targetSlot = activeRace.slots.find(s => s.id === user.slot);
                                  return (
                                  <div key={user.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all gap-4 
                                      ${user.isMe ? 'bg-amber-50 border-amber-300 shadow-md ring-4 ring-amber-500/10' : 'bg-white border-slate-200 hover:bg-slate-50 hover:shadow-md'}`}>
                                      
                                      <div className="flex items-start gap-4 w-full sm:w-auto">
                                          <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-black text-xl shadow-inner border-2 border-white
                                              ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-yellow-500/50' 
                                              : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' 
                                              : 'bg-gradient-to-br from-orange-300 to-orange-400 text-white'}`}>
                                              {idx + 1}
                                          </div>
                                          
                                          <div className="flex-1 min-w-0 pt-0.5">
                                              <div className="font-black text-slate-800 flex flex-wrap items-center gap-2 text-lg mb-1">
                                                  <span className="truncate">{user.name}</span>
                                                  {user.isMe && <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md border border-amber-400 shrink-0 font-bold shadow-sm">我</span>}
                                                  {user.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded font-black shrink-0"><Crown size={12} className="mr-1"/> VIP</span>}
                                              </div>
                                              
                                              <div className="flex flex-col gap-1 mt-2">
                                                  <span className="text-xs text-slate-600 font-bold bg-slate-100 w-fit px-2.5 py-1 rounded-md truncate">
                                                      預約組別：{targetSlot?.group} - {targetSlot?.name}
                                                  </span>
                                                  <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5 ml-1 mt-0.5">
                                                      <Clock size={12}/> 登記時間：{user.timestamp}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-end gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                          <div className="text-xs font-black text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                              Tier {user.tier}
                                          </div>
                                          {isGodMode && !isPastRace && (
                                              <button onClick={() => handleApproveFromWaitlist(user)} title="手動核准報名" className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-green-600/20 flex items-center gap-1.5 transition-all active:scale-95">
                                                  <UserCheck size={16}/> 遞補
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              )})
                          )}
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-4 lg:sticky lg:top-8 pb-32 lg:pb-0">
                  <div className="bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-900/30 border border-slate-800 p-6 md:p-8 text-white z-30 flex flex-col">
                      <h3 className="text-xl font-black mb-8 border-b border-slate-700 pb-5 flex items-center gap-2">
                          <Activity className="text-blue-400"/> 系統資格審查 (ID Check)
                      </h3>
                      
                      <div className="flex-1">
                          {isGodMode && (
                              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl text-sm font-bold flex items-start gap-3 mb-8 shadow-inner">
                                  <Zap size={20} className="shrink-0 text-amber-400 mt-0.5"/> 
                                  <div>
                                      <div className="mb-1 text-amber-300">賽事總監模式啟用</div>
                                      <div className="text-xs font-normal opacity-80 leading-relaxed">無視所有防呆限制，可任意強制安插或踢除人員。</div>
                                  </div>
                              </div>
                          )}

                          <div className={`space-y-5 ${isGodMode || isPastRace ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                              <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
                                  <span className="text-sm text-slate-300 font-medium">當屆會員身分</span>
                                  {checks.isCurrentMember ? <CheckCircle size={20} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> : <XCircle size={20} className="text-red-500"/>}
                              </div>
                              <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
                                  <span className="text-sm text-slate-300 font-medium">醫護證照效期</span>
                                  {checks.isLicenseValid ? <CheckCircle size={20} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> : <XCircle size={20} className="text-red-500"/>}
                              </div>
                              {['鐵人三項', '二鐵', '路跑接力', '游泳'].includes(activeRace.type) && (
                                  <div className="flex items-center justify-between bg-blue-900/20 p-4 rounded-xl border border-blue-800/30 mt-4">
                                      <div>
                                          <div className="text-sm text-blue-300 font-bold mb-1">三鐵戰袍檢核</div>
                                          <div className="text-[10px] text-slate-400">本賽事強制要求著三鐵衣</div>
                                      </div>
                                      {checks.isTriShirtValid ? <CheckCircle size={20} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> : <XCircle size={20} className="text-red-500"/>}
                                  </div>
                              )}
                              {!checks.genderMatch && (
                                  <div className="flex items-center justify-between bg-pink-900/20 p-4 rounded-xl border border-pink-800/30 mt-4">
                                      <span className="text-sm text-pink-300 font-bold">生理性別限制</span>
                                      <XCircle size={20} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"/>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] lg:static lg:bg-transparent lg:p-0 lg:border-t lg:mt-8 lg:pt-6 lg:shadow-none lg:backdrop-blur-none">
                          {(!allPassed && !isGodMode) || isPastRace ? (
                              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-bold flex gap-3 mb-4 lg:mb-6">
                                  <AlertTriangle size={20} className="shrink-0 mt-0.5"/>
                                  <div className="leading-relaxed">
                                      {openMessage || '資料不符報名規定，按鈕已鎖定。'}
                                  </div>
                              </div>
                          ) : null}

                          <button onClick={handleRegister} disabled={isPastRace || (!allPassed && !isGodMode) || !selectedSlot}
                              className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 
                                  disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:border-transparent
                                  ${isPastRace ? 'bg-slate-800 text-slate-500' :
                                    isSelectedSlotFull && selectedSlot 
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]' 
                                      : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]'}`}
                          >
                              {isPastRace ? '🚫 賽事已結束' : isSelectedSlotFull && selectedSlot ? '⚡ 滿編：登記進入候補池' : '✅ 資格核准，立即報名'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {previewSlot && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setPreviewSlot(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm md:max-w-md w-full p-6 animate-bounce-in flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 shrink-0">
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> 已報名夥伴名單</h3>
                      <button onClick={() => setPreviewSlot(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-4 pb-4 border-b border-slate-100 leading-snug shrink-0">
                      {previewSlot.group} - {previewSlot.name}
                  </div>
                  <div className="overflow-y-auto space-y-3 custom-scrollbar pr-2 flex-1">
                      {previewSlot.assignees.map((participant, i) => {
                          const cleanName = participant.name.split('#')[0].trim();
                          
                          return (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-default gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm ring-1 ring-slate-100"
                                      style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}
                                  >
                                      {getInitial(cleanName)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                          {cleanName}
                                          {renderRoleBadge(participant.roleTag)}
                                          {!participant.roleTag && participant.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> VIP</span>}
                                          {participant.isNew && <span className="flex items-center text-[10px] bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-black"><Sprout size={10} className="mr-1"/> 新人</span>}
                                          {participant.isLegacy && <span className="flex items-center text-[10px] bg-slate-100 text-slate-600 border border-slate-300 px-1.5 py-0.5 rounded font-black">舊名單</span>}
                                      </div>
                                      <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                                          <Clock size={10}/> 登記時間: {participant.timestamp}
                                      </div>
                                  </div>
                              </div>
                              
                              {isGodMode && !isPastRace ? (
                                  <button onClick={() => handleKickUser(previewSlot.id, participant.id || participant.name, participant.name)} className="shrink-0 p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-200" title="賽事總監踢除">
                                      <Trash2 size={18}/>
                                  </button>
                              ) : (
                                  <div className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded w-fit border border-green-100 shrink-0">已確認</div>
                              )}
                          </div>
                      )})}
                      {(!previewSlot.assignees || previewSlot.assignees.length === 0) && <div className="text-center text-slate-400 py-10 font-medium">目前尚無人員報名</div>}
                  </div>
                  <button onClick={() => setPreviewSlot(null)} className="w-full mt-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-95 shrink-0">關閉名單</button>
              </div>
          </div>
      )}

      {insertModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in" onClick={() => setInsertModalOpen(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-6 animate-bounce-in" onClick={e => e.stopPropagation()}>
                  <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2"><Zap className="text-amber-500"/> 賽事總監：強制安插人員</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">人員姓名</label>
                          <input type="text" className="w-full border border-slate-300 p-3 rounded-xl outline-none font-bold" placeholder="輸入要安插的姓名" value={insertData.name} onChange={e => setInsertData({...insertData, name: e.target.value})} autoFocus/>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">賦予特殊身分 (選填)</label>
                          <select className="w-full border border-slate-300 p-3 rounded-xl outline-none font-bold bg-white" value={insertData.roleTag} onChange={e => setInsertData({...insertData, roleTag: e.target.value})}>
                              <option value="">無特殊身分 (一般參賽者)</option>
                              <option value="帶隊教官">🛡️ 帶隊教官</option>
                              <option value="賽道教官">🚩 賽道教官</option>
                              <option value="醫護教官">🏥 醫護教官</option>
                              <option value="官方代表">👑 官方代表</option>
                          </select>
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button onClick={handleForceInsert} className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-lg shadow-amber-500/30 transition-colors">確認安插</button>
                      <button onClick={() => setInsertModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">取消</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}