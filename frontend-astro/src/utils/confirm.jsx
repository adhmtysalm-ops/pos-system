import toast from 'react-hot-toast';

export const confirmAction = (message) => {
  return new Promise((resolve) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-gray-800">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(true);
            }}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
          >
            نعم، متأكد
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(false);
            }}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
          >
            إلغاء
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      style: { minWidth: '300px' }
    });
  });
};
