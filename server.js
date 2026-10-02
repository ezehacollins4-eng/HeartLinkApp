const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL is not set. API will fail until PostgreSQL is configured.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && !DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false,
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}
function safeUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, dob: u.dob, age: u.age, gender: u.gender,
    want: u.want, city: u.city, bio: u.bio, interests: u.interests || [],
    intention: u.intention, occupation: u.occupation, education: u.education,
    languages: u.languages || ['English'], photo: u.photo, photos: u.photos || [],
    verified: u.verified, created_at: u.created_at
  };
}
function ageFromDob(dob) {
  const d = new Date(dob), now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

app.get('/api/health', async (req,res) => {
  try { await pool.query('SELECT 1'); res.json({ ok:true, database:true }); }
  catch (e) { res.status(503).json({ ok:false, database:false, error:e.message }); }
});


app.post('/api/auth/demo', async (req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const email='demo@heartlink.app', password='demo1234';
    let r=await client.query('SELECT * FROM users WHERE email=$1',[email]);
    if(!r.rowCount){
      const hash=await bcrypt.hash(password,12);
      r=await client.query(`INSERT INTO users(email,password_hash,name,dob,age,gender,want,city,bio,interests,intention,occupation,education,languages,photo,photos,verified)
        VALUES($1,$2,'Alex','1998-06-15',28,'Other','Everyone','Lagos','Designer who loves travel, coffee, and good conversations ☕✈️',
        ARRAY['Travel','Coffee','Design','Music','Fitness'],'Dating','Product Designer','UNILAG',ARRAY['English'],'https://i.pravatar.cc/600?u=alex',ARRAY['https://i.pravatar.cc/600?u=alex'],true) RETURNING *`,[email,hash]);
    }
    const user=r.rows[0];
    const demoProfiles=[
      ['maya.demo@heartlink.app','Maya','Woman',26,'Lagos','Creative, curious, and always looking for a new place to explore ✈️',['Travel','Art','Coffee','Music'],'https://i.pravatar.cc/600?u=maya'],
      ['sophia.demo@heartlink.app','Sophia','Woman',25,'Lagos','Book lover, foodie and weekend beach walker 🌊',['Books','Food','Beach','Fitness'],'https://i.pravatar.cc/600?u=sophia'],
      ['daniel.demo@heartlink.app','Daniel','Man',29,'Lagos','Tech, football, good food and genuine conversations.',['Tech','Football','Food','Travel'],'https://i.pravatar.cc/600?u=daniel'],
      ['jordan.demo@heartlink.app','Jordan','Other',27,'Lagos','Music, photography and spontaneous adventures 📸',['Music','Photography','Travel','Movies'],'https://i.pravatar.cc/600?u=jordan'],
      ['chioma.demo@heartlink.app','Chioma','Woman',28,'Lagos','Good energy, great food, and meaningful conversations 💕',['Food','Dance','Travel','Music'],'https://i.pravatar.cc/600?u=chioma'],
      ['sam.demo@heartlink.app','Sam','Man',27,'Lagos','Fitness, movies and finding hidden gems around the city.',['Fitness','Movies','Food','Coffee'],'https://i.pravatar.cc/600?u=sam']
    ];
    const ids=[];
    for(const x of demoProfiles){
      let q=await client.query('SELECT id FROM users WHERE email=$1',[x[0]]);
      if(!q.rowCount){
        const hash=await bcrypt.hash('demo1234',12);
        q=await client.query(`INSERT INTO users(email,password_hash,name,dob,age,gender,want,city,bio,interests,intention,occupation,languages,photo,photos,verified)
          VALUES($1,$2,$3,'1998-01-01',$4,$5,'Everyone',$6,$7,$8,$9,'Dating','',ARRAY['English'],$10,ARRAY[$10],true) RETURNING id`,
          [x[0],hash,x[1],x[3],x[2],x[4],x[5],x[6],x[7]]);
      }
      ids.push(q.rows[0].id);
    }
    // Give the demo account two real mutual matches, leaving the other profiles discoverable.
    for(const id of ids.slice(0,2)){
      await client.query(`INSERT INTO swipes(from_user,to_user,direction) VALUES($1,$2,'like') ON CONFLICT DO NOTHING`,[user.id,id]);
      await client.query(`INSERT INTO swipes(from_user,to_user,direction) VALUES($1,$2,'like') ON CONFLICT DO NOTHING`,[id,user.id]);
      const a=user.id < id ? user.id : id, b=user.id < id ? id : user.id;
      await client.query(`INSERT INTO matches(user_a,user_b) VALUES($1,$2) ON CONFLICT DO NOTHING`,[a,b]);
    }
    await client.query('COMMIT');
    res.json({token:sign(user),user:safeUser(user)});
  }catch(e){
    await client.query('ROLLBACK'); console.error(e); res.status(500).json({error:'Demo login unavailable'});
  }finally{client.release();}
});
app.post('/api/auth/register', async (req,res) => {
  try {
    const { email, password, name, dob, gender, want, city, intention, bio, interests, photo } = req.body;
    if (!email || !password || !name || !dob || !gender || !want) return res.status(400).json({error:'Missing required fields'});
    if (password.length < 8) return res.status(400).json({error:'Password must be at least 8 characters'});
    const age = ageFromDob(dob);
    if (age < 18) return res.status(400).json({error:'HeartLink is 18+ only'});
    const existing = await pool.query('SELECT id FROM users WHERE email=$1',[email.toLowerCase()]);
    if (existing.rowCount) return res.status(409).json({error:'Email already registered'});
    const hash = await bcrypt.hash(password, 12);
    const q = `INSERT INTO users
      (email,password_hash,name,dob,age,gender,want,city,intention,bio,interests,photo,photos)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`;
    const r = await pool.query(q,[email.toLowerCase(),hash,name,dob,age,gender,want,city||'Lagos',intention||'Dating',bio||'',interests||[],photo||null,photo?[photo]:[]]);
    const user=r.rows[0];
    res.status(201).json({token:sign(user),user:safeUser(user)});
  } catch(e) { console.error(e); res.status(500).json({error:'Registration failed'}); }
});

app.post('/api/auth/login', async (req,res) => {
  try {
    const {email,password}=req.body;
    const r=await pool.query('SELECT * FROM users WHERE email=$1',[String(email||'').toLowerCase()]);
    if (!r.rowCount || !(await bcrypt.compare(password||'',r.rows[0].password_hash))) return res.status(401).json({error:'Invalid email or password'});
    res.json({token:sign(r.rows[0]),user:safeUser(r.rows[0])});
  } catch(e) { console.error(e); res.status(500).json({error:'Login failed'}); }
});

app.get('/api/me',auth,async(req,res)=>{
  try { const r=await pool.query('SELECT * FROM users WHERE id=$1',[req.user.id]); if(!r.rowCount)return res.status(404).json({error:'User not found'}); res.json({user:safeUser(r.rows[0])}); }
  catch(e){res.status(500).json({error:'Could not load profile'});}
});

app.put('/api/profile',auth,async(req,res)=>{
  try {
    const allowed=['name','city','bio','occupation','education','gender','want','intention','interests','languages','photo','photos'];
    const sets=[], vals=[];
    for(const k of allowed) if(req.body[k]!==undefined){ vals.push(req.body[k]); sets.push(`${k}=$${vals.length}`); }
    if(!sets.length)return res.status(400).json({error:'Nothing to update'});
    vals.push(req.user.id);
    const r=await pool.query(`UPDATE users SET ${sets.join(',')},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,vals);
    res.json({user:safeUser(r.rows[0])});
  }catch(e){console.error(e);res.status(500).json({error:'Profile update failed'});}
});

app.post('/api/profile/photo',auth,upload.single('photo'),async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'Image required'});
  const url=`/uploads/${req.file.filename}`;
  try {
    const r=await pool.query(`UPDATE users SET photo=$1, photos=ARRAY[$1],updated_at=NOW() WHERE id=$2 RETURNING *`,[url,req.user.id]);
    res.json({url,user:safeUser(r.rows[0])});
  } catch(e){res.status(500).json({error:'Photo save failed'});}
});

app.get('/api/discover',auth,async(req,res)=>{
  try {
    const me=(await pool.query('SELECT * FROM users WHERE id=$1',[req.user.id])).rows[0];
    const ageMin=Math.max(18,Number(req.query.ageMin||18)), ageMax=Math.min(100,Number(req.query.ageMax||80));
    const limit=Math.min(50,Math.max(1,Number(req.query.limit||30)));
    const want=me.want;
    const genderClause=want==='Everyone'?'':want==='Women'?'AND u.gender=$2':'AND u.gender=$2';
    const params=[req.user.id, ...(want==='Everyone'?[]:[want==='Women'?'Woman':'Man'])];
    const sql=`SELECT u.id,u.name,u.age,u.gender,u.city,u.bio,u.interests,u.photo,u.photos,u.verified,u.occupation,u.education,u.intention
      FROM users u
      WHERE u.id<>$1 AND u.age BETWEEN ${want==='Everyone'?'$2':'$3'} AND ${want==='Everyone'?'$4':'$4'}
      ${genderClause}
      AND NOT EXISTS(SELECT 1 FROM swipes s WHERE s.from_user=$1 AND s.to_user=u.id)
      ORDER BY u.created_at DESC LIMIT ${limit}`;
    // Keep query simple and deterministic.
    let r;
    if(want==='Everyone') r=await pool.query(`SELECT u.id,u.name,u.age,u.gender,u.city,u.bio,u.interests,u.photo,u.photos,u.verified,u.occupation,u.education,u.intention
      FROM users u WHERE u.id<>$1 AND u.age BETWEEN $2 AND $3
      AND NOT EXISTS(SELECT 1 FROM swipes s WHERE s.from_user=$1 AND s.to_user=u.id)
      ORDER BY u.created_at DESC LIMIT $4`,[req.user.id,ageMin,ageMax,limit]);
    else r=await pool.query(`SELECT u.id,u.name,u.age,u.gender,u.city,u.bio,u.interests,u.photo,u.photos,u.verified,u.occupation,u.education,u.intention
      FROM users u WHERE u.id<>$1 AND u.gender=$2 AND u.age BETWEEN $3 AND $4
      AND NOT EXISTS(SELECT 1 FROM swipes s WHERE s.from_user=$1 AND s.to_user=u.id)
      ORDER BY u.created_at DESC LIMIT $5`,[req.user.id,want==='Women'?'Woman':'Man',ageMin,ageMax,limit]);
    res.json({profiles:r.rows.map(x=>({...x,photos:x.photos?.length?x.photos:[x.photo].filter(Boolean),distance:1}))});
  }catch(e){console.error(e);res.status(500).json({error:'Could not load discover feed'});}
});

app.post('/api/swipes',auth,async(req,res)=>{
  try{
    const {toUserId,direction}=req.body;
    if(!toUserId || !['like','pass','super'].includes(direction)) return res.status(400).json({error:'Invalid swipe'});
    if(String(toUserId)===String(req.user.id)) return res.status(400).json({error:'Cannot swipe yourself'});
    await pool.query(`INSERT INTO swipes(from_user,to_user,direction) VALUES($1,$2,$3)
      ON CONFLICT(from_user,to_user) DO UPDATE SET direction=EXCLUDED.direction,created_at=NOW()`,[req.user.id,toUserId,direction]);
    let match=null;
    if(direction!=='pass'){
      const mutual=await pool.query(`SELECT 1 FROM swipes WHERE from_user=$1 AND to_user=$2 AND direction IN('like','super')`,[toUserId,req.user.id]);
      if(mutual.rowCount){
        const m=await pool.query(`INSERT INTO matches(user_a,user_b) VALUES(LEAST($1,$2),GREATEST($1,$2))
          ON CONFLICT(user_a,user_b) DO UPDATE SET created_at=matches.created_at RETURNING *`,[req.user.id,toUserId]);
        match=m.rows[0];
      }
    }
    res.json({liked:direction!=='pass',match:!!match,matchId:match?.id||null});
  }catch(e){console.error(e);res.status(500).json({error:'Swipe failed'});}
});

app.get('/api/matches',auth,async(req,res)=>{
  try{
    const r=await pool.query(`SELECT m.id,m.created_at,
      CASE WHEN m.user_a=$1 THEN u2.id ELSE u1.id END other_id,
      CASE WHEN m.user_a=$1 THEN u2.name ELSE u1.name END name,
      CASE WHEN m.user_a=$1 THEN u2.age ELSE u1.age END age,
      CASE WHEN m.user_a=$1 THEN u2.city ELSE u1.city END city,
      CASE WHEN m.user_a=$1 THEN u2.photo ELSE u1.photo END photo,
      CASE WHEN m.user_a=$1 THEN u2.photos ELSE u1.photos END photos,
      (SELECT text FROM messages x WHERE x.match_id=m.id ORDER BY x.created_at DESC LIMIT 1) last_msg,
      (SELECT created_at FROM messages x WHERE x.match_id=m.id ORDER BY x.created_at DESC LIMIT 1) last_msg_time
      FROM matches m JOIN users u1 ON u1.id=m.user_a JOIN users u2 ON u2.id=m.user_b
      WHERE m.user_a=$1 OR m.user_b=$1 ORDER BY m.created_at DESC`,[req.user.id]);
    res.json({matches:r.rows.map(x=>({...x,match_id:x.id,id:x.other_id,lastMsg:x.last_msg,lastMsgTime:x.last_msg_time,photos:x.photos?.length?x.photos:[x.photo]}))});
  }catch(e){console.error(e);res.status(500).json({error:'Could not load matches'});}
});

async function ownsMatch(userId,matchId){
  const r=await pool.query('SELECT * FROM matches WHERE id=$1 AND (user_a=$2 OR user_b=$2)',[matchId,userId]);
  return r.rows[0];
}
app.get('/api/matches/:id/messages',auth,async(req,res)=>{
  try{
    const m=await ownsMatch(req.user.id,req.params.id); if(!m)return res.status(404).json({error:'Match not found'});
    const r=await pool.query(`SELECT id,sender_id,text,created_at FROM messages WHERE match_id=$1 ORDER BY created_at ASC`,[m.id]);
    res.json({messages:r.rows.map(x=>({id:x.id,from:String(x.sender_id)===String(req.user.id)?'me':'them',text:x.text,time:x.created_at}))});
  }catch(e){res.status(500).json({error:'Could not load messages'});}
});
app.post('/api/matches/:id/messages',auth,async(req,res)=>{
  try{
    const m=await ownsMatch(req.user.id,req.params.id); if(!m)return res.status(404).json({error:'Match not found'});
    const text=String(req.body.text||'').trim(); if(!text)return res.status(400).json({error:'Message cannot be empty'});
    if(text.length>2000)return res.status(400).json({error:'Message too long'});
    const r=await pool.query('INSERT INTO messages(match_id,sender_id,text) VALUES($1,$2,$3) RETURNING id,sender_id,text,created_at',[m.id,req.user.id,text]);
    const x=r.rows[0]; res.status(201).json({message:{id:x.id,from:'me',text:x.text,time:x.created_at}});
  }catch(e){console.error(e);res.status(500).json({error:'Message failed'});}
});
app.delete('/api/matches/:id',auth,async(req,res)=>{
  try{
    const m=await ownsMatch(req.user.id,req.params.id); if(!m)return res.status(404).json({error:'Match not found'});
    await pool.query('DELETE FROM matches WHERE id=$1',[m.id]); res.json({ok:true});
  }catch(e){res.status(500).json({error:'Unmatch failed'});}
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

async function start(){
  try{
    if(DATABASE_URL){
      await pool.query('SELECT 1');
      console.log('PostgreSQL connected');
    }
  }catch(e){console.error('Database connection failed:',e.message);}
  app.listen(PORT,()=>console.log(`HeartLink listening on ${PORT}`));
}
start();
