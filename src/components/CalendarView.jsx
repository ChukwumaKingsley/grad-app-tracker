import React, { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { Link } from 'react-router-dom';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }), getDay, locales });

function YearView({ events }) {
  // show 12 months with counts
  const months = Array.from({ length: 12 }).map((_, i) => {
    const monthStart = new Date(new Date().getFullYear(), i, 1);
    const count = events.filter(e => e.start.getMonth() === i && e.start.getFullYear() === monthStart.getFullYear()).length;
    return { i, label: monthStart.toLocaleString('default', { month: 'short' }), count };
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map(m => (
        <div key={m.i} className="p-3 border rounded bg-white">
          <div className="font-semibold">{m.label}</div>
          <div className="text-sm text-gray-600">{m.count} event{m.count === 1 ? '' : 's'}</div>
        </div>
      ))}
    </div>
  );
}

export default function CalendarView({ events = [], viewMode = 'month', onViewChange }) {
  const selectedView = viewMode === 'year' ? Views.MONTH : viewMode.toUpperCase();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const modalRef = useRef();

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setSelectedEvent(null);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  function handleSelectEvent(event) {
    // event.resource contains the original deadline object
    setSelectedEvent(event.resource || event);
  }

  function closeModal() { setSelectedEvent(null); }

  if (viewMode === 'year') return <YearView events={events} />;

  return (
    <div className="bg-white p-2 rounded">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        views={{ month: true, week: true, day: true, agenda: true }}
        view={viewMode}
        onView={v => onViewChange(v)}
        onSelectEvent={handleSelectEvent}
        popup
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div ref={modalRef} className="relative z-10 w-full max-w-lg bg-white rounded shadow-lg p-4">
            <button aria-label="Close" className="absolute right-3 top-3 text-gray-600 hover:text-gray-900" onClick={closeModal}>✕</button>
            <h3 className="text-lg font-semibold mb-2">{selectedEvent.application?.school_name || selectedEvent.application?.program || selectedEvent.name}</h3>
            <div className="text-sm text-gray-700 mb-2">
              <div><strong>Program:</strong> {selectedEvent.application?.program || '—'}</div>
              <div><strong>Event:</strong> {selectedEvent.name}</div>
              <div><strong>Date:</strong> {new Date(selectedEvent.date).toLocaleDateString()}</div>
              <div><strong>Country:</strong> {selectedEvent.application?.country || '—'}</div>
              <div><strong>Status:</strong> {selectedEvent.application?.status || '—'}</div>
            </div>
            <div className="flex justify-end gap-2">
              {selectedEvent.application?.id && (
                <Link onClick={closeModal} to={`/application/${selectedEvent.application.id}`} state={{ from: '/timelines' }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">View Program</Link>
              )}
              <button onClick={closeModal} className="px-3 py-1 border rounded text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
