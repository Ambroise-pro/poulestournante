/* EPS Manager SDK — version 1.0
   À copier dans une application et à charger dans sa page : <script src="eps-sdk.js"></script>
   L'application, placée dans un dossier modules/<nom>/ d'EPS Manager, peut alors :
     - lire les classes et les élèves d'EPS Manager (et la classe ou la séance d'où elle est ouverte) ;
     - envoyer des notes, des résultats par élève et un résumé, qui arrivent dans EPS Manager.
   Hors d'EPS Manager, EPSManager.available() vaut false et les envois sont ignorés : l'application
   continue de fonctionner seule. Aucune dépendance. Les données restent sur l'appareil (localStorage). */
(function (global) {
  'use strict';
  var VERSION = '1.0';
  var match = location.pathname.match(/\/modules\/([^\/]+)\//);
  var id = match ? decodeURIComponent(match[1]) : null;
  var CTX = 'eps-manager:context:' + id, OUT = 'eps-manager:outbox:' + id;
  var DATE = /^\d{4}-\d{2}-\d{2}$/;

  function read(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function context() { return id ? read(CTX, null) : null; }
  function outbox() { var o = read(OUT, null); if (!o || typeof o !== 'object') o = {}; o.grades = o.grades || {}; o.results = o.results || {}; o.summaries = o.summaries || {}; return o; }
  function check(cond, msg) { if (!cond) throw new Error('EPSManager : ' + msg); }
  function put(kind, item) {
    if (!api.available()) return false;
    check(item && typeof item.key === 'string' && item.key, 'chaque envoi a besoin d’une « key » stable (texte)');
    var o = outbox(); o[kind][item.key] = item; o.updatedAt = Date.now();
    return write(OUT, o);
  }
  function classOfStudent(studentId) {
    var cls = api.classes();
    for (var i = 0; i < cls.length; i++) for (var j = 0; j < cls[i].students.length; j++) if (cls[i].students[j].id === studentId) return cls[i];
    return null;
  }

  var api = {
    version: VERSION,
    /** Nom du dossier de l'application dans modules/ (null hors d'EPS Manager). */
    moduleId: id,
    /** true si l'application est ouverte depuis EPS Manager (classes disponibles). */
    available: function () { return !!context(); },
    /** Tout le contexte : {module, today, focus, classes, sessions, updatedAt}. */
    context: context,
    /** Classes : [{id, name, students: [{id, first, last, sex: 'F'|'G'|'', photo, inapt, attendance}]}].
        inapt : inaptitude en cours (texte, vide sinon) ; attendance : statut à l'appel du jour
        ('Présent', 'Absent', 'Retard', 'Oubli de tenue'…, vide si l'appel n'est pas fait). Mis à jour en direct. */
    classes: function () { var c = context(); return c && Array.isArray(c.classes) ? c.classes : []; },
    classById: function (classId) { return api.classes().filter(function (c) { return c.id === classId; })[0] || null; },
    /** Élèves d'une classe, triés par nom. */
    students: function (classId) { var c = api.classById(classId); return c ? c.students.slice().sort(function (a, b) { return (a.last + a.first).localeCompare(b.last + b.first, 'fr'); }) : []; },
    student: function (studentId) { var c = classOfStudent(studentId); return c ? c.students.filter(function (s) { return s.id === studentId; })[0] : null; },
    classOfStudent: classOfStudent,
    /** Classe ou séance d'où l'application a été ouverte : {classId, sessionId} ou null. */
    focus: function () { var c = context(); return c && c.focus || null; },
    /** Séance d'où l'application a été ouverte : {id, classId, date, time, duration, title} ou null. */
    focusSession: function () { var c = context(), f = c && c.focus; return f && f.sessionId ? (c.sessions || []).filter(function (s) { return s.id === f.sessionId; })[0] || null : null; },
    /** Cycles : [{id, classId, name, start, end, sessions: [{id, date, time}]}]. */
    cycles: function () { var c = context(); return c && Array.isArray(c.cycles) ? c.cycles : []; },
    /** Date du jour au format AAAA-MM-JJ. */
    today: today,
    /** « NOM Prénom ». */
    fullName: function (s) { return s ? String(s.last || '').toLocaleUpperCase('fr') + ' ' + (s.first || '') : ''; },

    /** Note → Évaluations d'EPS Manager. {key, studentId, name, grade (nombre, sur 20 de préférence), date} */
    grade: function (g) {
      check(g && g.studentId, 'grade() : studentId manquant'); check(isFinite(Number(g.grade)), 'grade() : note non numérique');
      return put('grades', {key: g.key, studentId: g.studentId, name: String(g.name || 'Note'), grade: Number(g.grade), date: DATE.test(g.date || '') ? g.date : today()});
    },
    /** Résultat d'un élève → séance de sa classe à cette date. {key, studentId, label, value, unit, date} */
    result: function (r) {
      check(r && r.studentId, 'result() : studentId manquant');
      var c = classOfStudent(r.studentId); check(c, 'result() : élève inconnu');
      return put('results', {key: r.key, classId: c.id, studentId: r.studentId, label: String(r.label || ''), value: String(r.value == null ? '' : r.value), unit: String(r.unit || ''), date: DATE.test(r.date || '') ? r.date : today()});
    },
    /** Résumé pour une classe → séance de cette classe à cette date. {key, classId, text, date} */
    summary: function (s) {
      check(s && s.classId && s.text, 'summary() : classId et text obligatoires');
      return put('summaries', {key: s.key, classId: s.classId, text: String(s.text), date: DATE.test(s.date || '') ? s.date : today()});
    },
    /** Retire un envoi (note, résultat ou résumé) par sa key. */
    remove: function (key) { var o = outbox(); delete o.grades[key]; delete o.results[key]; delete o.summaries[key]; o.updatedAt = Date.now(); return write(OUT, o); },
    /** Retire tous les envois dont la key commence par prefix (tous si absent). */
    clear: function (prefix) { var o = outbox(); ['grades', 'results', 'summaries'].forEach(function (k) { Object.keys(o[k]).forEach(function (key) { if (!prefix || key.indexOf(prefix) === 0) delete o[k][key]; }); }); o.updatedAt = Date.now(); return write(OUT, o); },
    /** Tous les envois en attente de reprise par EPS Manager. */
    pending: function () { var o = outbox(); return {grades: Object.values(o.grades), results: Object.values(o.results), summaries: Object.values(o.summaries)}; },
    /** Appelle callback(context) quand EPS Manager met à jour les classes (autre onglet, nouvelle ouverture). */
    onChange: function (callback) { global.addEventListener('storage', function (e) { if (e.key === CTX) callback(context()); }); }
  };
  global.EPSManager = api;
})(window);
