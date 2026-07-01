import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every hour in the background just in case
      if (r) {
        setInterval(() => {
          r.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="bg-white border border-blue-100 shadow-xl rounded-xl p-4 max-w-sm flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
              <RefreshCw className={`w-5 h-5 ${needRefresh ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                {needRefresh ? 'تحديث جديد متاح! 🚀' : 'النظام جاهز للعمل بدون إنترنت'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {needRefresh 
                  ? 'تم إصدار نسخة جديدة من النظام. يرجى التحديث للحصول على أحدث الميزات.' 
                  : 'تم تحميل كافة الملفات بنجاح. يمكنك استخدام النظام حتى لو انقطع الإنترنت.'}
              </p>
            </div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {needRefresh && (
          <button 
            onClick={() => updateServiceWorker(true)} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
          >
            تحديث النظام الآن
          </button>
        )}
      </div>
    </div>
  )
}

export default ReloadPrompt
