const API = '/api';
export function getToken(){return localStorage.getItem('cc_token');}
export async function api(path, options={}){const headers={...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(options.headers||{})}; if(getToken())headers.Authorization=`Bearer ${getToken()}`; const response=await fetch(`${API}${path}`,{...options,headers}); const type=response.headers.get('content-type')||''; const data=type.includes('application/json')?await response.json():response; if(!response.ok)throw new Error(data.error||'Request failed'); return data;}
