'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

type Customer = { id: string; name: string; phone: string };

interface SearchableCustomerSelectProps {
  customers: Customer[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function SearchableCustomerSelect({
  customers,
  selectedId,
  onChange,
  disabled = false,
  required = false,
}: SearchableCustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedId);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (customerId: string) => {
    onChange(customerId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input / Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="form-select"
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.7rem 1rem',
          background: disabled ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
          border: isOpen ? '1px solid var(--gold)' : '1px solid var(--border)',
          color: selectedCustomer ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ textAlign: 'left', flex: 1 }}>
          {selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.phone}` : 'Select a customer...'}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          style={{
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--text-muted)',
            flexShrink: 0,
            marginLeft: '0.5rem',
          }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            right: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            zIndex: 1000,
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              padding: '0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={handleInputChange}
              className="form-input"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                fontSize: '0.85rem',
                margin: 0,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Customer List */}
          <div
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {filteredCustomers.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                {customers.length === 0
                  ? 'No customers found'
                  : `No customers matching "${searchQuery}"`}
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer.id)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    textAlign: 'left',
                    background: selectedId === customer.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    color: selectedId === customer.id ? 'var(--gold)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={e => {
                    if (selectedId !== customer.id) {
                      (e.target as HTMLElement).style.background = 'var(--bg-card)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedId !== customer.id) {
                      (e.target as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontWeight: selectedId === customer.id ? 600 : 500, fontSize: '0.9rem' }}>
                    {customer.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {customer.phone}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Required indicator (hidden but needed for form validation) */}
      {required && !selectedId && (
        <input
          type="hidden"
          value=""
          required
          aria-hidden="true"
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}
