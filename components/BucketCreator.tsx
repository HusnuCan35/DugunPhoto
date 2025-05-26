"use client";
import { useState, useEffect } from "react";
import { supabase } from "../src/lib/supabaseClient";

export default function BucketCreator() {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function initStorage() {
      try {
        setStatus("Storage kontrol ediliyor...");
        
        // Sadece bucket varlığını kontrol et
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.log("Storage listesi kontrol edilemiyor:", listError.message);
          setStatus("Storage offline - yerel mod aktif");
          return;
        }
        
        const photoBucket = buckets?.find(b => b.name === "photos");
        
        if (photoBucket) {
          console.log("✅ Photos bucket mevcut ve hazır");
          setStatus("Storage bağlantısı başarılı");
        } else {
          console.log("⚠️ Photos bucket bulunamadı");
          setStatus("Storage yapılandırma gerekiyor");
        }
        
      } catch (err) {
        console.log("Storage kontrol hatası:", err);
        setStatus("Yerel mod - Storage çevrimdışı");
        setError("");
      }
    }
    
    initStorage();
  }, []);

  // Hiçbir UI gösterme, sadece arka plan kontrolü
  if (process.env.NODE_ENV === 'development') {
    console.log("BucketCreator Status:", status);
    if (error) console.log("BucketCreator Error:", error);
  }
  
  return null;
} 