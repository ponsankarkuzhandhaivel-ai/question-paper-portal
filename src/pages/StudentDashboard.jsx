import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  apiGetRegulations,
  apiGetSubjects,
  apiGetPapers,
  getPaperViewUrl,
  getPaperDownloadUrl,
} from '../services/api';

export default function StudentDashboard() {
  const { user } = useAuth();

  // Filters
  const [regulation, setRegulation] = useState('R2023');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [liveSearch, setLiveSearch] = useState('');

  // Data
  const [regulations, setRegulations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Load Regulations on mount
  useEffect(() => {
    async function loadRegs() {
      try {
        const data = await apiGetRegulations();
        if (data?.success && Array.isArray(data.regulations)) {
          setRegulations(data.regulations);
        }
      } catch (err) {
        console.error('Failed to load regulations:', err);
      }
    }
    loadRegs();
  }, []);

  // Load Subjects when Regulation or Semester changes
  useEffect(() => {
    async function loadSubjs() {
      setLoadingSubjects(true);
      try {
        const data = await apiGetSubjects(user?.department, regulation, semester);
        if (data?.success && Array.isArray(data.subjects)) {
          setSubjects(data.subjects);
        } else {
          setSubjects([]);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjs();
  }, [regulation, semester, user?.department]);

  // Search Papers function
  const fetchPapers = async () => {
    setLoadingPapers(true);
    try {
      const filters = {};
      if (regulation) filters.regulation = regulation;
      if (semester) filters.semester = semester;
      if (academicYear) filters.academic_year = academicYear;
      if (subjectId) filters.subject_id = subjectId;

      const data = await apiGetPapers(filters);
      if (data?.success && Array.isArray(data.papers)) {
        setPapers(data.papers);
      } else {
        setPapers([]);
      }
    } catch (err) {
      console.error('Failed to search papers:', err);
      setPapers([]);
    } finally {
      setLoadingPapers(false);
    }
  };

  // Initial papers search on mount
  useEffect(() => {
    fetchPapers();
  }, []);

  const handleReset = () => {
    setSemester('');
    setAcademicYear('');
    setSubjectId('');
    setLiveSearch('');
    // Trigger reset search
    apiGetPapers({ regulation }).then((data) => {
      if (data?.success && Array.isArray(data.papers)) setPapers(data.papers);
    });
  };

  // Filter papers client-side by live search term
  const displayedPapers = useMemo(() => {
    const term = liveSearch.trim().toLowerCase();
    if (!term) return papers;
    return papers.filter((p) => {
      return (
        p.subject_name?.toLowerCase().includes(term) ||
        p.subject_code?.toLowerCase().includes(term) ||
        p.academic_year?.toString().includes(term)
      );
    });
  }, [papers, liveSearch]);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-content">
        {/* Student Profile Card */}
        <section className="profile-banner">
          <div className="profile-avatar">
            {(user?.name || user?.user_id || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="profile-details">
            <h2>Welcome, {user?.name || user?.user_id}!</h2>
            <div className="profile-meta-tags">
              <span className="meta-tag">
                <strong>ID:</strong> {user?.user_id}
              </span>
              <span className="meta-tag">
                <strong>Department:</strong> {user?.department}
              </span>
              <span className="meta-tag">
                <strong>Curriculum:</strong> Anna University (Autonomous)
              </span>
            </div>
          </div>
        </section>

        {/* Filter Controls Card */}
        <section className="panel-card filter-card">
          <div className="card-header-simple">
            <h3><span>🔍</span> Filter Semester Question Papers</h3>
            <p>Select your curriculum criteria below to find verified exam papers.</p>
          </div>

          <div className="filter-grid">
            <div className="form-group">
              <label htmlFor="regSelect">Regulation</label>
              <select
                id="regSelect"
                value={regulation}
                onChange={(e) => setRegulation(e.target.value)}
              >
                {regulations.map((r) => (
                  <option key={r.id || r.code} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="semSelect">Semester</label>
              <select
                id="semSelect"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">All Semesters</option>
                <option value="1">Semester 1 (Common)</option>
                <option value="2">Semester 2 (Common)</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="yearSelect">Academic Year</label>
              <select
                id="yearSelect"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="">All Academic Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subSelect">Subject</label>
              <select
                id="subSelect"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={loadingSubjects}
              >
                <option value="">
                  {loadingSubjects ? 'Loading subjects...' : 'All Subjects'}
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} - {s.subject_name} (Sem {s.semester})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-actions-bar">
            <button onClick={fetchPapers} className="btn-primary-action">
              <span>🔎</span> Search Papers
            </button>
            <button onClick={handleReset} className="btn-secondary-action">
              Reset
            </button>
          </div>
        </section>

        {/* Papers Results Section */}
        <section className="panel-card results-card">
          <div className="results-header-bar">
            <h4>
              <span>📁</span> {displayedPapers.length} Question Paper
              {displayedPapers.length === 1 ? '' : 's'} Found
            </h4>
            <div className="live-search-wrap">
              <input
                type="text"
                placeholder="Live search by code or name..."
                value={liveSearch}
                onChange={(e) => setLiveSearch(e.target.value)}
                className="live-search-input"
              />
            </div>
          </div>

          {loadingPapers ? (
            <div className="empty-state">
              <div className="spinner"></div>
              <p>Searching question papers...</p>
            </div>
          ) : displayedPapers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h4>No Question Papers Found</h4>
              <p>Try adjusting your semester, subject, or academic year filter.</p>
            </div>
          ) : (
            <div className="papers-grid">
              {displayedPapers.map((paper) => {
                const viewUrl = getPaperViewUrl(paper.id, user?.user_id);
                const downloadUrl = getPaperDownloadUrl(paper.id, user?.user_id);

                return (
                  <div key={paper.id} className="paper-card">
                    <div className="paper-card-header">
                      <div className="paper-badges">
                        <span className="badge badge-code">{paper.subject_code}</span>
                        <span className="badge badge-sem">Sem {paper.semester}</span>
                        <span className="badge badge-year">{paper.academic_year}</span>
                      </div>
                      <h4 className="paper-title">{paper.subject_name}</h4>
                      <p className="paper-meta">
                        Regulation: {paper.regulation_code || 'R2023'} &bull; Dept: {paper.department_code || user?.department}
                      </p>
                    </div>

                    <div className="paper-actions">
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view"
                      >
                        <span>👁️</span> View PDF
                      </a>
                      <a
                        href={downloadUrl}
                        download
                        className="btn-download"
                      >
                        <span>📥</span> Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
